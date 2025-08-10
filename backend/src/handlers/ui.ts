import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';

type UiActionArgs = {
  appId: 'terminal' | 'files' | 'mail' | 'calendar';
  action: 'open' | 'focus' | 'type' | 'sendKey';
  params?: { text?: string; key?: string };
};

const UI_ACTION_SCHEMA: JSONSchemaType<UiActionArgs> = {
  type: 'object',
  required: ['appId', 'action'],
  properties: {
    appId: { type: 'string', enum: ['terminal', 'files', 'mail', 'calendar'] as any },
    action: { type: 'string', enum: ['open', 'focus', 'type', 'sendKey'] as any },
    params: {
      type: 'object',
      nullable: true,
      properties: {
        text: { type: 'string', nullable: true },
        key: { type: 'string', nullable: true },
      },
      additionalProperties: false,
    },
  },
};

export async function handleUiAction(args: unknown, _context: LogContext) {
  emitProgress(1, 2, 'validating');
  const a = validateOrThrow(UI_ACTION_SCHEMA, args, 'ui_action');
  emitProgress(2, 2, 'emitting ui intent');
  return {
    content: [
      {
        type: 'json',
        data: {
          ok: true,
          uiIntent: { action: a.action, appId: a.appId, params: a.params ?? {} },
        },
      },
    ],
  };
}

