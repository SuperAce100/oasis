import { spawn } from 'child_process';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';

/**
 * Schema for terminal.execute@v1
 */
const TERMINAL_EXECUTE_SCHEMA = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      description: 'Shell command to execute',
      minLength: 1,
      maxLength: 500
    },
    cwd: {
      type: 'string',
      description: 'Working directory for command execution (optional)',
      maxLength: 200,
      default: '/'
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

/**
 * Handle terminal.execute@v1 - Execute command locally (hackathon demo)
 */
export async function handleTerminalExecute(args: unknown, context: LogContext) {
  emitProgress(context, 'Validating command');
  validateOrThrow(TERMINAL_EXECUTE_SCHEMA, args, 'terminal.execute@v1');
  
  const { command, cwd = '/' } = args as { command: string; cwd?: string };

  // Basic security check
  for (const blocked of BLOCKED_COMMANDS) {
    if (command.includes(blocked)) {
      throw BAD_REQUEST(`Command blocked for security: ${blocked}`);
    }
  }

  emitProgress(context, 'Executing command');

  return new Promise((resolve, reject) => {
    // For hackathon demo: use local execution (Docker can be added later)
    const child = spawn('sh', ['-c', `cd "${cwd}" && ${command}`]);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({
        content: [{
          type: 'json',
          data: {
            command,
            cwd,
            exitCode: exitCode || 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timestamp: new Date().toISOString(),
            mode: 'local'
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