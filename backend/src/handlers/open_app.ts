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
    hintClass: { type: 'string', nullable: true }
  },
  required: ['target'],
  additionalProperties: false
};

function run(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }>{
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
  emitProgress(1, 4, 'validating input');
  const { target, action = 'open', hintClass } = validateOrThrow(OPEN_APP_SCHEMA, args, 'open_app@v1');

  // Very basic environment checks
  if (process.platform !== 'linux') {
    throw BAD_REQUEST('open_app is only supported on Linux in this environment');
  }

  const attempted: Array<{ cmd: string; args: string[]; code: number; stdout: string; stderr: string }> = [];

  try {
    emitProgress(2, 4, action === 'open' ? 'opening app' : 'focusing app');

    if (action === 'open') {
      // Try direct spawn of the target command
      let res = await run(target, []);
      attempted.push({ cmd: target, args: [], ...res });

      if (res.code !== 0) {
        // Try gtk-launch with desktop file id
        res = await run('gtk-launch', [target]);
        attempted.push({ cmd: 'gtk-launch', args: [target], ...res });
      }

      if (attempted[attempted.length - 1].code !== 0) {
        // Try xdg-open for files/URLs
        const res2 = await run('xdg-open', [target]);
        attempted.push({ cmd: 'xdg-open', args: [target], ...res2 });
      }

      const final = attempted[attempted.length - 1];
      if (final.code !== 0) {
        throw INTERNAL_ERROR(`Failed to open target. Last error: ${final.stderr || final.stdout || final.code}`);
      }
    } else {
      // Focus existing window with wmctrl or xdotool
      let used = false;
      if (hintClass) {
        const res = await run('wmctrl', ['-x', '-a', hintClass]);
        attempted.push({ cmd: 'wmctrl', args: ['-x', '-a', hintClass], ...res });
        used = true;
      }

      if (!used || attempted[attempted.length - 1].code !== 0) {
        // Try focus by name
        const res = await run('wmctrl', ['-a', target]);
        attempted.push({ cmd: 'wmctrl', args: ['-a', target], ...res });
      }

      if (attempted[attempted.length - 1].code !== 0) {
        // Fallback: xdotool search & activate
        const search = await run('xdotool', ['search', '--name', target]);
        attempted.push({ cmd: 'xdotool', args: ['search', '--name', target], ...search });
        const winId = search.stdout.split(/\s+/)[0];
        if (winId) {
          const act = await run('xdotool', ['windowactivate', winId]);
          attempted.push({ cmd: 'xdotool', args: ['windowactivate', winId], ...act });
        }
      }

      const final = attempted[attempted.length - 1];
      if (final.code !== 0) {
        throw INTERNAL_ERROR(`Failed to focus target. Last error: ${final.stderr || final.stdout || final.code}`);
      }
    }

    emitProgress(3, 4, 'success');

    return {
      content: [
        {
          type: 'json',
          data: {
            target,
            action,
            attempted,
            timestamp: new Date().toISOString()
          }
        }
      ]
    };
  } catch (err: any) {
    emitProgress(4, 4, 'error');
    throw err;
  }
}