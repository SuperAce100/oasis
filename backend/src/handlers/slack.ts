import { JSONSchemaType } from "ajv";
import axios from "axios";
import { validateOrThrow } from "../utils/ajv.js";
import { BAD_REQUEST, INTERNAL_ERROR, UNAUTHORIZED } from "../utils/errors.js";
import type { LogContext } from "../utils/logger.js";
import { emitProgress } from "../utils/logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SlackPostMessageArgs {
  channel: string;
  text: string;
  thread_ts?: string;
}

export interface SlackListConversationsArgs {
  types?: string; // e.g., "public_channel,private_channel,im,mpim"
  limit?: number;
  cursor?: string;
}

export interface SlackGetHistoryArgs {
  channel: string;
  limit?: number;
  cursor?: string;
}

export interface SlackOpenConversationArgs {
  users: string; // comma-separated user IDs
}

// ============================================================================
// SCHEMAS
// ============================================================================

const SLACK_POST_MESSAGE_SCHEMA: JSONSchemaType<SlackPostMessageArgs> = {
  type: "object",
  required: ["channel", "text"],
  properties: {
    channel: { type: "string", minLength: 1 },
    text: { type: "string", minLength: 1 },
    thread_ts: { type: "string", nullable: true },
  },
};

const SLACK_LIST_CONVERSATIONS_SCHEMA: JSONSchemaType<SlackListConversationsArgs> = {
  type: "object",
  properties: {
    types: { type: "string", nullable: true },
    limit: { type: "number", minimum: 1, maximum: 1000, nullable: true },
    cursor: { type: "string", nullable: true },
  },
};

const SLACK_GET_HISTORY_SCHEMA: JSONSchemaType<SlackGetHistoryArgs> = {
  type: "object",
  required: ["channel"],
  properties: {
    channel: { type: "string", minLength: 1 },
    limit: { type: "number", minimum: 1, maximum: 1000, nullable: true },
    cursor: { type: "string", nullable: true },
  },
};

const SLACK_OPEN_CONVERSATION_SCHEMA: JSONSchemaType<SlackOpenConversationArgs> = {
  type: "object",
  required: ["users"],
  properties: {
    users: { type: "string", minLength: 1 },
  },
};

// ============================================================================
// HELPERS
// ============================================================================

async function slackGet(token: string, method: string, params?: Record<string, any>): Promise<any> {
  const url = `https://slack.com/api/${method}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
  if (!response.data?.ok) {
    throw INTERNAL_ERROR(`Slack API error for ${method}: ${response.data?.error || "unknown_error"}`);
  }
  return response.data;
}

async function slackPost(token: string, method: string, body?: Record<string, any>): Promise<any> {
  const url = `https://slack.com/api/${method}`;
  const response = await axios.post(url, body ?? {}, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-type": "application/json; charset=utf-8",
    },
  });
  if (!response.data?.ok) {
    throw INTERNAL_ERROR(`Slack API error for ${method}: ${response.data?.error || "unknown_error"}`);
  }
  return response.data;
}

function resolveToken(explicitToken?: string): string {
  const token = explicitToken || process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw UNAUTHORIZED("Slack bot token not configured (SLACK_BOT_TOKEN)");
  }
  return token;
}

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleSlackPostMessage(
  args: unknown,
  _context: LogContext,
  tokenParam?: string
) {
  const validated = validateOrThrow(SLACK_POST_MESSAGE_SCHEMA, args, "slack.post_message@v1");
  const token = resolveToken(tokenParam);

  emitProgress(0.3, 1.0, "Posting Slack message...");

  const body: any = {
    channel: validated.channel,
    text: validated.text,
  };
  if (validated.thread_ts) body.thread_ts = validated.thread_ts;

  const data = await slackPost(token, "chat.postMessage", body);
  emitProgress(1.0, 1.0, "Slack message posted");
  return { messageTs: data.ts || data.message?.ts, channel: data.channel, raw: data };
}

export async function handleSlackListConversations(
  args: unknown,
  _context: LogContext,
  tokenParam?: string
) {
  const validated = validateOrThrow(
    SLACK_LIST_CONVERSATIONS_SCHEMA,
    args,
    "slack.list_conversations@v1"
  );
  const token = resolveToken(tokenParam);

  emitProgress(0.3, 1.0, "Listing Slack conversations...");

  const params: Record<string, any> = {};
  if (validated.types) params.types = validated.types;
  if (validated.limit) params.limit = validated.limit;
  if (validated.cursor) params.cursor = validated.cursor;

  const data = await slackGet(token, "conversations.list", params);
  emitProgress(1.0, 1.0, "Conversations listed");
  return { channels: data.channels, nextCursor: data.response_metadata?.next_cursor };
}

export async function handleSlackGetHistory(
  args: unknown,
  _context: LogContext,
  tokenParam?: string
) {
  const validated = validateOrThrow(SLACK_GET_HISTORY_SCHEMA, args, "slack.get_history@v1");
  const token = resolveToken(tokenParam);

  emitProgress(0.3, 1.0, "Fetching Slack conversation history...");

  const params: Record<string, any> = { channel: validated.channel };
  if (validated.limit) params.limit = validated.limit;
  if (validated.cursor) params.cursor = validated.cursor;

  const data = await slackGet(token, "conversations.history", params);
  emitProgress(1.0, 1.0, "History fetched");
  return { messages: data.messages, hasMore: data.has_more, nextCursor: data.response_metadata?.next_cursor };
}

export async function handleSlackOpenConversation(
  args: unknown,
  _context: LogContext,
  tokenParam?: string
) {
  const validated = validateOrThrow(
    SLACK_OPEN_CONVERSATION_SCHEMA,
    args,
    "slack.open_conversation@v1"
  );
  const token = resolveToken(tokenParam);

  emitProgress(0.3, 1.0, "Opening Slack conversation...");

  const data = await slackPost(token, "conversations.open", { users: validated.users });
  emitProgress(1.0, 1.0, "Conversation opened");
  return { channel: data.channel };
}

