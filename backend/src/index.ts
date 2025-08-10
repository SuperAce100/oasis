#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "dotenv";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import {
  handleGmailList,
  handleGmailSearch,
  handleGmailRead,
  handleGmailSend,
} from "./handlers/gmail.js";
import { handleGitHubCreateIssue } from "./handlers/github.js";
import { handleNotionGetPage } from "./handlers/notion.js";
import { handleStatusGetJob, handleStatusListJobs } from "./handlers/status.js";
import { handleTerminalExecute } from "./handlers/terminal.js";
import { handleContactsList, handleContactsSearch } from "./handlers/contacts.js";
import { handleUiAction } from "./handlers/ui.js";
import {
  handleFsHealth,
  handleFsRoots,
  handleFsExists,
  handleFsStat,
  handleFsDir,
  handleFsResolve,
  handleFsRead,
  handleFsWrite,
  handleFsMkdir,
  handleFsMove,
  handleFsDelete,
  handleFsFind,
  handleFsComplete,
} from "./handlers/fs.js";
import { handleOpenApp } from "./handlers/open_app.js";
import { handleDoAnything } from "./handlers/do_anything.js";
import {
  handleSlackPostMessage,
  handleSlackListConversations,
  handleSlackGetHistory,
  handleSlackOpenConversation,
  handleSlackAuthTest,
} from "./handlers/slack.js";
import { logStart, logSuccess, logError, LogContext } from "./utils/logger.js";
import { MCPError } from "./utils/errors.js";

// Load environment variables
config();

// Environment configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Server instance
const server = new Server(
  {
    name: "oasis-hub",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions
const tools: Tool[] = [];

// Conditionally register Gmail tools
if (
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  fs.existsSync(path.resolve(process.cwd(), "credentials.json")) ||
  fs.existsSync(path.resolve(process.cwd(), "../credentials.json")) ||
  fs.existsSync(path.resolve(process.cwd(), "../backend/credentials.json"))
) {
  // Email tools
  tools.push({
    name: "list_email",
    description: "List Gmail messages with optional filtering",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Maximum emails to return",
          default: 20,
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Gmail label IDs to filter by",
        },
        query: { type: "string", description: "Gmail search query" },
        unreadOnly: { type: "boolean", description: "Show only unread emails", default: false },
      },
    },
  });

  tools.push({
    name: "search_email",
    description: "Search Gmail messages with advanced queries",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          minLength: 1,
          description: 'Gmail search query (e.g., "from:example@gmail.com subject:meeting")',
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Maximum results to return",
          default: 20,
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description: "Gmail label IDs to filter by",
        },
      },
      required: ["query"],
    },
  });

  tools.push({
    name: "read_email",
    description: "Fetch a single Gmail message with body and headers",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", minLength: 1, description: "Gmail message ID" },
        format: {
          type: "string",
          enum: ["full", "minimal", "raw"],
          description: "Message format (full, minimal, or raw)",
          default: "full",
        },
      },
      required: ["messageId"],
    },
  });

  tools.push({
    name: "send_email",
    description: "Send a new email via Gmail",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: { type: "string", format: "email" },
          minItems: 1,
          description: "Recipient email addresses",
        },
        cc: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "CC recipient email addresses",
        },
        bcc: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "BCC recipient email addresses",
        },
        subject: { type: "string", minLength: 1, description: "Email subject" },
        body: { type: "string", minLength: 1, description: "Email body content" },
        format: {
          type: "string",
          enum: ["html", "text"],
          description: "Body format",
          default: "text",
        },
      },
      required: ["to", "subject", "body"],
    },
  });
}

// Conditionally register GitHub tool
if (GITHUB_TOKEN) {
  tools.push({
    name: "create_github_issue",
    description: "Create a new issue in a GitHub repository",

    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner/organization name",
        },
        repo: {
          type: "string",
          description: "Repository name",
        },
        title: {
          type: "string",
          description: "Issue title",
          maxLength: 256,
        },
        body: {
          type: "string",
          description: "Issue body/description (optional)",
        },
        labels: {
          type: "array",
          description: "Array of label names to apply (optional)",
          items: {
            type: "string",
          },
        },
        assignees: {
          type: "array",
          description: "Array of usernames to assign (optional)",
          items: {
            type: "string",
          },
        },
      },
      required: ["owner", "repo", "title"],
    },
  });
}

// Conditionally register Notion tool
if (NOTION_TOKEN) {
  tools.push({
    name: "get_notion_page",
    description: "Retrieve a Notion page by ID with optional children blocks",
    inputSchema: {
      type: "object",
      properties: {
        pageId: {
          type: "string",
          description: "Notion page ID (with or without dashes)",
          pattern: "^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$",
        },
        includeChildren: {
          type: "boolean",
          description: "Whether to include child blocks (optional, default: false)",
        },
      },
      required: ["pageId"],
    },
  });
}

// Always register status tools
// tools.push({
//   name: "get_job_status",
//   description: "Get the status of a job by ID",
//   inputSchema: {
//     type: "object",
//     properties: {
//       jobId: {
//         type: "string",
//         description: "Unique job identifier",
//       },
//     },
//     required: ["jobId"],
//   },
// });

// tools.push({
//   name: "list_jobs",
//   description: "List jobs with optional filtering",
//   inputSchema: {
//     type: "object",
//     properties: {
//       status: {
//         type: "string",
//         enum: ["pending", "running", "completed", "failed"],
//         description: "Filter by job status (optional)",
//       },
//       limit: {
//         type: "number",
//         minimum: 1,
//         maximum: 100,
//         description: "Maximum number of jobs to return (optional, default: 20)",
//       },
//     },
//   },
// });

// Terminal execution tool
tools.push({
  name: "execute_terminal",
  description: "Execute shell commands locally. Returns stdout, stderr, and exit code.",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: 'Shell command to execute (e.g., "ls -la", "echo hello")',
        minLength: 1,
        maxLength: 500,
      },
      cwd: {
        type: "string",
        description: 'Working directory for command execution (optional, defaults to "/")',
        maxLength: 200,
      },
    },
    required: ["command"],
  },
});

// Slack tools (enabled if token present)
if (process.env.SLACK_BOT_TOKEN) {
  tools.push({
    name: "slack_post_message",
    description: "Post a message to a Slack channel (by ID)",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID (e.g., C...)" },
        text: { type: "string", description: "Message text" },
        thread_ts: { type: "string", description: "Optional thread ts" },
      },
      required: ["channel", "text"],
    },
  });
  tools.push({
    name: "slack_list_conversations",
    description: "List conversations visible to the bot",
    inputSchema: {
      type: "object",
      properties: {
        types: { type: "string", description: "public_channel,private_channel,im,mpim" },
        limit: { type: "number", description: "Max results (1-1000)", minimum: 1, maximum: 1000 },
        cursor: { type: "string", description: "Pagination cursor" },
      },
    },
  });
  tools.push({
    name: "slack_get_history",
    description: "Get message history for a channel",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        limit: { type: "number", description: "Max results (1-1000)", minimum: 1, maximum: 1000 },
        cursor: { type: "string", description: "Pagination cursor" },
      },
      required: ["channel"],
    },
  });
  tools.push({
    name: "slack_open_conversation",
    description: "Open a DM or MPIM by user IDs (comma-separated)",
    inputSchema: {
      type: "object",
      properties: {
        users: { type: "string", description: "Comma-separated user IDs (e.g., U...,U...)" },
      },
      required: ["users"],
    },
  });
  tools.push({
    name: "slack_auth_test",
    description: "Slack auth.test (team/app identity)",
    inputSchema: { type: "object", properties: {} },
  });
}

// Alias for MCP clients expecting the spec-style name
tools.push({
  name: "terminal.execute@v1",
  description:
    "Execute shell commands in a sandboxed environment. Returns stdout, stderr, and exit code.",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: 'Shell command to execute (e.g., "ls -la", "echo hello")',
        minLength: 1,
        maxLength: 500,
      },
      cwd: {
        type: "string",
        description: 'Virtual working directory (e.g., "/home/oasis", mapped into sandbox) ',
        maxLength: 200,
      },
    },
    required: ["command"],
  },
});

// Filesystem tools (simple, consistent names)
// Contacts tools (Google People API)
tools.push({
  name: "list_contacts",
  description: "List contacts (Google People API)",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "number" }, pageToken: { type: "string" } },
  },
});
tools.push({
  name: "search_contacts",
  description: "Search contacts (Google People API)",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "number" } },
    required: ["query"],
  },
});
// Expose a minimal, read-only subset of filesystem tools for clients
tools.push({
  name: "fs_health",
  description: "Filesystem health and roots",
  inputSchema: { type: "object", properties: {} },
});
tools.push({
  name: "fs_roots",
  description: "List allowed filesystem roots",
  inputSchema: { type: "object", properties: {} },
});
tools.push({
  name: "fs_dir",
  description: "List directory",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      cwd: { type: "string" },
      includeHidden: { type: "boolean" },
      limit: { type: "number" },
      cursor: { type: "string" },
    },
    required: ["path"],
  },
});
tools.push({
  name: "fs_read",
  description: "Read file contents",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      cwd: { type: "string" },
      encoding: { type: "string", enum: ["utf8", "base64"] },
      maxBytes: { type: "number" },
    },
    required: ["path"],
  },
});

// UI action (simulated inside Oasis)
tools.push({
  name: "ui_action",
  description: "Emit a UI intent for the frontend to open/focus/type in apps",
  inputSchema: {
    type: "object",
    properties: {
      appId: { type: "string", enum: ["terminal", "files", "mail", "calendar"] },
      action: { type: "string", enum: ["open", "focus", "type", "sendKey"] },
      params: { type: "object", properties: { text: { type: "string" }, key: { type: "string" } } },
    },
    required: ["appId", "action"],
  },
});

// New: Open app tool
tools.push({
  name: "open_app",
  description: "Open an application or focus its window on the desktop (Linux only).",
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "App name/desktop id/path/URL", minLength: 1 },
      action: {
        type: "string",
        enum: ["open", "focus"],
        description: "Whether to open or focus",
        default: "open",
      },
      hintClass: { type: "string", description: "Optional X11/WM class hint for focusing" },
    },
    required: ["target"],
  },
});

// New: Do-anything tool (computer-use loop)
tools.push({
  name: "do_anything",
  description:
    "Spawn a computer-use agent: screenshot + vision model to propose and execute actions in a loop.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "High-level user goal", minLength: 1 },
      maxSteps: {
        type: "number",
        description: "Maximum steps to run",
        minimum: 1,
        maximum: 50,
        default: 15,
      },
      dryRun: {
        type: "boolean",
        description: "If true, do not actually execute actions",
        default: false,
      },
      stepDelayMs: {
        type: "number",
        description: "Delay between steps in ms",
        minimum: 0,
        maximum: 60000,
        default: 250,
      },
    },
    required: ["goal"],
  },
});

// Wrapper function for consistent logging and error handling
function wrap<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  handler: T
): (args: unknown) => Promise<any> {
  return async (args: unknown) => {
    const traceId = randomUUID();
    const context: LogContext = { traceId };
    const startTime = Date.now();

    try {
      logStart(context, toolName, args);

      // Inject context as second parameter for handlers
      const result = await handler(args, context);

      const latencyMs = Date.now() - startTime;
      logSuccess(context, toolName, latencyMs);

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logError(context, toolName, error as Error, latencyMs);
      throw error;
    }
  };
}

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Only allow calling tools that are explicitly registered/exposed
    const exposedToolNames = new Set(tools.map((t) => t.name));
    if (!exposedToolNames.has(name)) {
      throw new MCPError(`Unknown or disabled tool: ${name}`, "BAD_REQUEST");
    }
    switch (name) {
      // Gmail endpoints
      case "list_email":
        if (
          !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
          !fs.existsSync(path.join(process.cwd(), "credentials.json"))
        ) {
          throw new MCPError("Gmail credentials not configured", "UNAUTHORIZED");
        }
        return await wrap("list_email", handleGmailList)(args);

      case "search_email":
        if (
          !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
          !fs.existsSync(path.join(process.cwd(), "credentials.json"))
        ) {
          throw new MCPError("Gmail credentials not configured", "UNAUTHORIZED");
        }
        return await wrap("search_email", handleGmailSearch)(args);

      case "read_email":
        if (
          !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
          !fs.existsSync(path.join(process.cwd(), "credentials.json"))
        ) {
          throw new MCPError("Gmail credentials not configured", "UNAUTHORIZED");
        }
        return await wrap("read_email", handleGmailRead)(args);

      case "send_email":
        if (
          !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
          !fs.existsSync(path.join(process.cwd(), "credentials.json"))
        ) {
          throw new MCPError("Gmail credentials not configured", "UNAUTHORIZED");
        }
        return await wrap("send_email", handleGmailSend)(args);

      case "create_github_issue":
        if (!GITHUB_TOKEN) {
          throw new MCPError("GitHub token not configured", "UNAUTHORIZED");
        }
        return await wrap("create_github_issue", async (args: unknown, context: LogContext) =>
          handleGitHubCreateIssue(args, context, GITHUB_TOKEN)
        )(args);

      case "get_notion_page":
        if (!NOTION_TOKEN) {
          throw new MCPError("Notion token not configured", "UNAUTHORIZED");
        }
        return await wrap("get_notion_page", async (args: unknown, context: LogContext) =>
          handleNotionGetPage(args, context, NOTION_TOKEN)
        )(args);

      case "get_job_status":
        return await wrap("get_job_status", handleStatusGetJob)(args);

      case "list_jobs":
        return await wrap("list_jobs", handleStatusListJobs)(args);

      case "execute_terminal":
        return await wrap("execute_terminal", handleTerminalExecute)(args);

      // Slack endpoints
      case "slack_post_message":
        if (!process.env.SLACK_BOT_TOKEN) throw new MCPError("Slack token not configured", "UNAUTHORIZED");
        return await wrap("slack_post_message", async (a: unknown, c: LogContext) =>
          handleSlackPostMessage(a, c, process.env.SLACK_BOT_TOKEN as string)
        )(args);
      case "slack_list_conversations":
        if (!process.env.SLACK_BOT_TOKEN) throw new MCPError("Slack token not configured", "UNAUTHORIZED");
        return await wrap("slack_list_conversations", async (a: unknown, c: LogContext) =>
          handleSlackListConversations(a, c, process.env.SLACK_BOT_TOKEN as string)
        )(args);
      case "slack_get_history":
        if (!process.env.SLACK_BOT_TOKEN) throw new MCPError("Slack token not configured", "UNAUTHORIZED");
        return await wrap("slack_get_history", async (a: unknown, c: LogContext) =>
          handleSlackGetHistory(a, c, process.env.SLACK_BOT_TOKEN as string)
        )(args);
      case "slack_open_conversation":
        if (!process.env.SLACK_BOT_TOKEN) throw new MCPError("Slack token not configured", "UNAUTHORIZED");
        return await wrap("slack_open_conversation", async (a: unknown, c: LogContext) =>
          handleSlackOpenConversation(a, c, process.env.SLACK_BOT_TOKEN as string)
        )(args);
      case "slack_auth_test":
        if (!process.env.SLACK_BOT_TOKEN) throw new MCPError("Slack token not configured", "UNAUTHORIZED");
        return await wrap("slack_auth_test", async (a: unknown, c: LogContext) =>
          handleSlackAuthTest(a, c, process.env.SLACK_BOT_TOKEN as string)
        )(args);

      case "terminal.execute@v1":
        return await wrap("terminal.execute@v1", handleTerminalExecute)(args);

      // FS endpoints
      case "fs_health":
        return await wrap("fs_health", async () => handleFsHealth())(args);
      case "fs_roots":
        return await wrap("fs_roots", async () => handleFsRoots())(args);
      case "fs_exists":
        return await wrap("fs_exists", handleFsExists)(args);
      case "fs_stat":
        return await wrap("fs_stat", handleFsStat)(args);
      case "fs_dir":
        return await wrap("fs_dir", handleFsDir)(args);
      case "fs_resolve":
        return await wrap("fs_resolve", handleFsResolve)(args);
      case "fs_read":
        return await wrap("fs_read", handleFsRead)(args);
      case "fs_write":
        return await wrap("fs_write", handleFsWrite)(args);
      case "fs_mkdir":
        return await wrap("fs_mkdir", handleFsMkdir)(args);
      case "fs_move":
        return await wrap("fs_move", handleFsMove)(args);
      case "fs_delete":
        return await wrap("fs_delete", handleFsDelete)(args);
      case "fs_find":
        return await wrap("fs_find", handleFsFind)(args);
      case "fs_complete":
        return await wrap("fs_complete", handleFsComplete)(args);

      case "ui_action":
        return await wrap("ui_action", handleUiAction)(args);

      case "open_app":
        return await wrap("open_app", handleOpenApp)(args);

      case "do_anything":
        return await wrap("do_anything", handleDoAnything)(args);

      // Contacts
      case "list_contacts":
        return await wrap("list_contacts", handleContactsList)(args);
      case "search_contacts":
        return await wrap("search_contacts", handleContactsSearch)(args);

      default:
        throw new MCPError(`Unknown tool: ${name}`, "BAD_REQUEST");
    }
  } catch (error) {
    if (error instanceof MCPError) {
      throw error;
    }
    // Convert unexpected errors to MCPError
    throw new MCPError(
      `Internal error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
      "INTERNAL_ERROR"
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();

  // Log startup information (to stderr to avoid interfering with stdio protocol)
  console.error(`[STARTUP] Oasis Hub MCP Server v0.1.0`);
  console.error(`[STARTUP] Registered tools: ${tools.map((t) => t.name).join(", ")}`);
  console.error(
    `[STARTUP] Gmail integration: ${
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      fs.existsSync(path.join(process.cwd(), "credentials.json"))
        ? "enabled"
        : "disabled"
    }`
  );
  console.error(`[STARTUP] GitHub integration: ${GITHUB_TOKEN ? "enabled" : "disabled"}`);
  console.error(`[STARTUP] Notion integration: ${NOTION_TOKEN ? "enabled" : "disabled"}`);
  console.error(`[STARTUP] Starting stdio transport...`);

  await server.connect(transport);
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.error("[SHUTDOWN] Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[SHUTDOWN] Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error("[FATAL] Failed to start server:", error);
  process.exit(1);
});
