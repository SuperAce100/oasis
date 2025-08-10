import { spawn } from 'child_process';
import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';

export interface OpenAppArgs {
  target: string; // app name, desktop file id, file path, or URL
  action?: 'open' | 'focus';
  hintClass?: string; // optional X11/WM class hint for focusing
}

const OPEN_APP_SCHEMA: JSONSchemaType<OpenAppArgs> = {
  type: 'object',
  properties: {
    target: { type: 'string', minLength: 1 },
    action: { type: 'string', enum: ['open', 'focus'], nullable: true },
    hintClass: { type: 'string', nullable: true },
  },
  required: ['target'],
  additionalProperties: false,
};

function run(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

export async function handleOpenApp(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating input');
  const { target, action = 'open' } = validateOrThrow(OPEN_APP_SCHEMA, args, 'open_app');

  // Side-effect free: emit a UI intent for the frontend OS to open the requested app window.
  emitProgress(2, 3, 'computing ui intent');

  const lower = String(target).toLowerCase();
  let appId: 'terminal' | 'mail' | 'calendar' | 'files' | undefined;
  if (['terminal', 'shell', 'bash', 'zsh', 'sh'].some((k) => lower.includes(k))) appId = 'terminal';
  else if (['mail', 'gmail', 'email', 'inbox'].some((k) => lower.includes(k))) appId = 'mail';
  else if (['calendar', 'cal'].some((k) => lower.includes(k))) appId = 'calendar';
  else if (['files', 'file', 'explorer', 'finder'].some((k) => lower.includes(k))) appId = 'files';
  // also accept direct ids
  if (!appId && ['terminal', 'mail', 'calendar', 'files'].includes(lower)) appId = lower as any;

  emitProgress(3, 3, 'success');

  return {
    content: [
      {
        type: 'json',
        data: {
          target,
          action,
          timestamp: new Date().toISOString(),
          uiIntent: appId ? { action: 'open_app', appId } : undefined,
        },
      },
    ],
  };
}

