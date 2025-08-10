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
import { handleOpenApp } from "./handlers/open_app.js";
import { handleDoAnything } from "./handlers/do_anything.js";
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
          description: "Message format",
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

// New: Open app tool
tools.push({
  name: "open_app",
  description: "Open an application or focus its window on the desktop (Linux only).",
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "App name/desktop id/path/URL", minLength: 1 },
      action: { type: "string", enum: ["open", "focus"], description: "Whether to open or focus", default: "open" },
      hintClass: { type: "string", description: "Optional X11/WM class hint for focusing" },
    },
    required: ["target"],
  },
});

// New: Do-anything tool (computer-use loop)
tools.push({
  name: "do_anything",
  description: "Spawn a computer-use agent: screenshot + vision model to propose and execute actions in a loop.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "High-level user goal", minLength: 1 },
      maxSteps: { type: "number", description: "Maximum steps to run", minimum: 1, maximum: 50, default: 15 },
      dryRun: { type: "boolean", description: "If true, do not actually execute actions", default: false },
      stepDelayMs: { type: "number", description: "Delay between steps in ms", minimum: 0, maximum: 60000, default: 250 },
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

      case "open_app":
        return await wrap("open_app", handleOpenApp)(args);

      case "do_anything":
        return await wrap("do_anything", handleDoAnything)(args);

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
