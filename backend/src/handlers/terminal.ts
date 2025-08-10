import { spawn } from 'child_process';
import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for terminal.execute@v1 arguments
 */
export interface TerminalExecuteArgs {
  command: string;
  cwd?: string;
}

/**
 * Schema for terminal.execute@v1
 */
const TERMINAL_EXECUTE_SCHEMA: JSONSchemaType<TerminalExecuteArgs> = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    cwd: {
      type: 'string',
      maxLength: 200,
      nullable: true
    }
  },
  required: ['command'],
  additionalProperties: false
};

/**
 * Basic security: block dangerous commands
 */
const BLOCKED_COMMANDS = [
  'rm -rf /', 'sudo', 'passwd', 
  'shutdown', 'reboot', 'halt'
];

// Sandbox root inside backend directory
const SANDBOX_ROOT = path.resolve(process.cwd(), 'sandbox');

async function ensureSandboxBase(): Promise<void> {
  await fs.promises.mkdir(SANDBOX_ROOT, { recursive: true });
  await fs.promises.mkdir(path.join(SANDBOX_ROOT, 'home', 'oasis'), { recursive: true });
  await fs.promises.mkdir(path.join(SANDBOX_ROOT, 'tmp'), { recursive: true });
}

function toVirtualCwd(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  const withoutLeading = input.replace(/^\/+/, '');
  const normalized = path.posix.normalize(withoutLeading);
  return normalized === '.' ? '' : normalized;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch as '"' | "'";
      continue;
    }
    if (ch === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Handle terminal.execute@v1 - Execute command in sandboxed environment
 */
export async function handleTerminalExecute(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating command');
  const validatedArgs = validateOrThrow(TERMINAL_EXECUTE_SCHEMA, args, 'terminal.execute@v1');
  
  const { command, cwd } = validatedArgs;

  // Basic security check
  for (const blocked of BLOCKED_COMMANDS) {
    if (command.includes(blocked)) {
      throw BAD_REQUEST(`Command blocked for security: ${blocked}`);
    }
  }

  emitProgress(2, 3, 'executing command');

  await ensureSandboxBase();

  // Virtualize cwd similar to frontend route
  const virtualCwd = toVirtualCwd(cwd);
  const absCwd = path.resolve(SANDBOX_ROOT, virtualCwd || '.');

  // Handle `cd` locally to maintain session-like CWD
  const argsTokens = tokenize(command.trim());
  if (argsTokens[0] === 'cd') {
    const rawTarget = argsTokens[1] ?? '';
    const target = rawTarget.replace(/^\/+/, '');
    const nextVirtual = path.posix.normalize(
      target ? path.posix.join(virtualCwd || '', target) : (virtualCwd || '')
    );

    const candidate = path.resolve(SANDBOX_ROOT, nextVirtual || '.');
    try {
      const stat = await fs.promises.stat(candidate);
      if (!stat.isDirectory()) {
        return {
          content: [{
            type: 'json',
            data: {
              command,
              cwd: '/' + (virtualCwd || ''),
              exitCode: 0,
              stdout: 'cd: Not a directory',
              stderr: '',
              timestamp: new Date().toISOString(),
              mode: 'sandbox'
            }
          }]
        };
      }
      const displayCwd = '/' + (nextVirtual || '');
      return {
        content: [{
          type: 'json',
          data: {
            command,
            cwd: displayCwd === '/' ? '/' : displayCwd,
            exitCode: 0,
            stdout: '',
            stderr: '',
            timestamp: new Date().toISOString(),
            mode: 'sandbox'
          }
        }]
      };
    } catch {
      return {
        content: [{
          type: 'json',
          data: {
            command,
            cwd: '/' + (virtualCwd || ''),
            exitCode: 0,
            stdout: 'cd: No such file or directory',
            stderr: '',
            timestamp: new Date().toISOString(),
            mode: 'sandbox'
          }
        }]
      };
    }
  }

  return new Promise((resolve, reject) => {
    // Execute inside sandbox by changing directory into sandbox-mapped cwd
    const child = spawn('sh', ['-c', `cd "${absCwd}" && ${command}`]);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      emitProgress(3, 3, 'command completed');
      const displayCwd = '/' + (virtualCwd || '');
      resolve({
        content: [{
          type: 'json',
          data: {
            command,
            cwd: displayCwd === '/' ? '/' : displayCwd,
            exitCode: exitCode || 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timestamp: new Date().toISOString(),
            mode: 'sandbox'
          }
        }]
      });
    });

    child.on('error', (error) => {
      reject(INTERNAL_ERROR(`Command execution failed: ${error.message}`));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(BAD_REQUEST('Command timed out after 30 seconds'));
    }, 30000);
  });
}