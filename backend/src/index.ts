#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

import {
  handleCalendarList,
  handleCalendarCreate,
  handleCalendarDelete,
  handleCalendarCancel,
  handleCalendarAccept,
  handleCalendarTentative,
  handleCalendarDecline,
  handleEmailList,
  handleEmailSearch,
  handleEmailRead,
  handleEmailSend
} from './handlers/outlook.js';
import { handleGitHubCreateIssue } from './handlers/github.js';
import { handleNotionGetPage } from './handlers/notion.js';
import { handleStatusGetJob, handleStatusListJobs } from './handlers/status.js';
import { handleTerminalExecute } from './handlers/terminal.js';
import { logStart, logSuccess, logError, LogContext } from './utils/logger.js';
import { MCPError } from './utils/errors.js';

// Load environment variables
config();

// Environment configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const OUTLOOK_TOKEN = process.env.OUTLOOK_TOKEN;

// Server instance
const server = new Server(
  {
    name: 'oasis-hub',
    version: '0.1.0',
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

// Conditionally register Outlook tools
if (OUTLOOK_TOKEN) {
  // Calendar tools
  tools.push({
    name: 'calendar.list@v1',
    description: 'List calendar events in a time range',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        start: { type: 'string', format: 'date-time', description: 'Start time filter (ISO 8601)' },
        end: { type: 'string', format: 'date-time', description: 'End time filter (ISO 8601)' },
        query: { type: 'string', description: 'Search query for event subjects' },
        includeCancelled: { type: 'boolean', description: 'Include cancelled events' },
        limit: { type: 'number', minimum: 1, maximum: 100, description: 'Maximum events to return' },
        orderBy: { type: 'string', enum: ['start', 'createdDateTime'], description: 'Sort order' }
      }
    }
  });

  tools.push({
    name: 'calendar.create@v1',
    description: 'Create a new calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        subject: { type: 'string', minLength: 1, description: 'Event subject' },
        body: { type: 'string', description: 'Event description' },
        start: { type: 'string', format: 'date-time', description: 'Start time (ISO 8601)' },
        end: { type: 'string', format: 'date-time', description: 'End time (ISO 8601)' },
        attendees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              type: { type: 'string', enum: ['required', 'optional'] }
            },
            required: ['email']
          },
          description: 'Event attendees'
        },
        location: { type: 'string', description: 'Event location' },
        isOnlineMeeting: { type: 'boolean', description: 'Create online meeting' },
        onlineMeetingProvider: { type: 'string', enum: ['teamsForBusiness', 'skypeForBusiness'] },
        reminderMinutesBeforeStart: { type: 'number', minimum: 0, description: 'Reminder time in minutes' }
      },
      required: ['subject', 'start', 'end']
    }
  });

  tools.push({
    name: 'calendar.delete@v1',
    description: 'Permanently delete a calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', minLength: 1, description: 'Event ID to delete' },
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        sendCancellations: { type: 'boolean', description: 'Send cancellation notifications' }
      },
      required: ['eventId']
    }
  });

  tools.push({
    name: 'calendar.cancel@v1',
    description: 'Cancel a meeting and notify attendees',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', minLength: 1, description: 'Event ID to cancel' },
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        comment: { type: 'string', description: 'Cancellation comment' }
      },
      required: ['eventId']
    }
  });

  tools.push({
    name: 'calendar.accept@v1',
    description: 'Accept a meeting invitation',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', minLength: 1, description: 'Event ID to accept' },
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        comment: { type: 'string', description: 'Response comment' },
        sendResponse: { type: 'boolean', description: 'Send response notification' }
      },
      required: ['eventId']
    }
  });

  tools.push({
    name: 'calendar.tentative@v1',
    description: 'Tentatively accept a meeting invitation',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', minLength: 1, description: 'Event ID to tentatively accept' },
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        comment: { type: 'string', description: 'Response comment' },
        sendResponse: { type: 'boolean', description: 'Send response notification' }
      },
      required: ['eventId']
    }
  });

  tools.push({
    name: 'calendar.decline@v1',
    description: 'Decline a meeting invitation',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', minLength: 1, description: 'Event ID to decline' },
        calendarId: { type: 'string', description: 'Calendar ID (optional)' },
        comment: { type: 'string', description: 'Response comment' },
        sendResponse: { type: 'boolean', description: 'Send response notification' }
      },
      required: ['eventId']
    }
  });

  // Email tools
  tools.push({
    name: 'email.list@v1',
    description: 'List emails from a mailbox/folder',
    inputSchema: {
      type: 'object',
      properties: {
        mailboxId: { type: 'string', description: 'Mailbox ID (optional)' },
        folderId: { type: 'string', description: 'Folder ID (optional)' },
        query: { type: 'string', description: 'Search query' },
        from: { type: 'string', description: 'Filter by sender email' },
        unreadOnly: { type: 'boolean', description: 'Show only unread emails' },
        limit: { type: 'number', minimum: 1, maximum: 100, description: 'Maximum emails to return' },
        orderBy: { type: 'string', enum: ['receivedDateTime', 'subject'], description: 'Sort order' }
      }
    }
  });

  tools.push({
    name: 'email.search@v1',
    description: 'Full-text search over emails',
    inputSchema: {
      type: 'object',
      properties: {
        mailboxId: { type: 'string', description: 'Mailbox ID (optional)' },
        query: { type: 'string', minLength: 1, description: 'Search query' },
        from: { type: 'string', description: 'Filter by sender email' },
        to: { type: 'string', description: 'Filter by recipient email' },
        subjectContains: { type: 'string', description: 'Subject contains text' },
        since: { type: 'string', format: 'date-time', description: 'Date range start' },
        until: { type: 'string', format: 'date-time', description: 'Date range end' },
        limit: { type: 'number', minimum: 1, maximum: 100, description: 'Maximum results' }
      },
      required: ['query']
    }
  });

  tools.push({
    name: 'email.read@v1',
    description: 'Fetch a single email with body and headers',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', minLength: 1, description: 'Email message ID' },
        mailboxId: { type: 'string', description: 'Mailbox ID (optional)' },
        format: { type: 'string', enum: ['html', 'text'], description: 'Body format preference' }
      },
      required: ['messageId']
    }
  });

  tools.push({
    name: 'email.send@v1',
    description: 'Send a new email (optionally with attachments)',
    inputSchema: {
      type: 'object',
      properties: {
        mailboxId: { type: 'string', description: 'Mailbox ID (optional)' },
        to: {
          type: 'array',
          items: { type: 'string', format: 'email' },
          minItems: 1,
          description: 'Recipient email addresses'
        },
        cc: {
          type: 'array',
          items: { type: 'string', format: 'email' },
          description: 'CC recipient email addresses'
        },
        bcc: {
          type: 'array',
          items: { type: 'string', format: 'email' },
          description: 'BCC recipient email addresses'
        },
        subject: { type: 'string', minLength: 1, description: 'Email subject' },
        body: { type: 'string', minLength: 1, description: 'Email body content' },
        format: { type: 'string', enum: ['html', 'text'], description: 'Body format' },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string', minLength: 1 },
              contentBytes: { type: 'string', description: 'Base64 encoded content' },
              mimeType: { type: 'string' }
            },
            required: ['filename', 'contentBytes']
          },
          description: 'Email attachments'
        }
      },
      required: ['to', 'subject', 'body']
    }
  });
}

// Conditionally register GitHub tool
if (GITHUB_TOKEN) {
  tools.push({
    name: 'github.create_issue@v1',
    description: 'Create a new issue in a GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner/organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        title: {
          type: 'string',
          description: 'Issue title',
          maxLength: 256,
        },
        body: {
          type: 'string',
          description: 'Issue body/description (optional)',
        },
        labels: {
          type: 'array',
          description: 'Array of label names to apply (optional)',
          items: {
            type: 'string',
          },
        },
        assignees: {
          type: 'array',
          description: 'Array of usernames to assign (optional)',
          items: {
            type: 'string',
          },
        },
      },
      required: ['owner', 'repo', 'title'],
    },
  });
}

// Conditionally register Notion tool
if (NOTION_TOKEN) {
  tools.push({
    name: 'notion.get_page@v1',
    description: 'Retrieve a Notion page by ID with optional children blocks',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'Notion page ID (with or without dashes)',
          pattern: '^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$',
        },
        includeChildren: {
          type: 'boolean',
          description: 'Whether to include child blocks (optional, default: false)',
        },
      },
      required: ['pageId'],
    },
  });
}

// Always register status tools
tools.push({
  name: 'status.get_job@v1',
  description: 'Get the status of a job by ID',
  inputSchema: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'Unique job identifier',
      },
    },
    required: ['jobId'],
  },
});

tools.push({
  name: 'status.list_jobs@v1',
  description: 'List jobs with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'running', 'completed', 'failed'],
        description: 'Filter by job status (optional)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of jobs to return (optional, default: 20)',
      },
    },
  },
});

// Terminal execution tool
tools.push({
  name: 'terminal.execute@v1',
  description: 'Execute shell commands locally. Returns stdout, stderr, and exit code.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute (e.g., "ls -la", "echo hello")',
        minLength: 1,
        maxLength: 500,
      },
      cwd: {
        type: 'string',
        description: 'Working directory for command execution (optional, defaults to "/")',
        maxLength: 200,
      },
    },
    required: ['command'],
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
      // Outlook Calendar endpoints
      case 'calendar.list@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.list@v1', handleCalendarList)(args);

      case 'calendar.create@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.create@v1', handleCalendarCreate)(args);

      case 'calendar.delete@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.delete@v1', handleCalendarDelete)(args);

      case 'calendar.cancel@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.cancel@v1', handleCalendarCancel)(args);

      case 'calendar.accept@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.accept@v1', handleCalendarAccept)(args);

      case 'calendar.tentative@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.tentative@v1', handleCalendarTentative)(args);

      case 'calendar.decline@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('calendar.decline@v1', handleCalendarDecline)(args);

      // Outlook Email endpoints
      case 'email.list@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('email.list@v1', handleEmailList)(args);

      case 'email.search@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('email.search@v1', handleEmailSearch)(args);

      case 'email.read@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('email.read@v1', handleEmailRead)(args);

      case 'email.send@v1':
        if (!OUTLOOK_TOKEN) {
          throw new MCPError('Outlook token not configured', 'UNAUTHORIZED');
        }
        return await wrap('email.send@v1', handleEmailSend)(args);

      case 'github.create_issue@v1':
        if (!GITHUB_TOKEN) {
          throw new MCPError('GitHub token not configured', 'UNAUTHORIZED');
        }
        return await wrap('github.create_issue@v1', 
          async (args: unknown, context: LogContext) => 
            handleGitHubCreateIssue(args, context, GITHUB_TOKEN)
        )(args);

      case 'notion.get_page@v1':
        if (!NOTION_TOKEN) {
          throw new MCPError('Notion token not configured', 'UNAUTHORIZED');
        }
        return await wrap('notion.get_page@v1', 
          async (args: unknown, context: LogContext) => 
            handleNotionGetPage(args, context, NOTION_TOKEN)
        )(args);

      case 'status.get_job@v1':
        return await wrap('status.get_job@v1', handleStatusGetJob)(args);

      case 'status.list_jobs@v1':
        return await wrap('status.list_jobs@v1', handleStatusListJobs)(args);

      case 'terminal.execute@v1':
        return await wrap('terminal.execute@v1', handleTerminalExecute)(args);

      default:
        throw new MCPError(`Unknown tool: ${name}`, 'BAD_REQUEST');
    }
  } catch (error) {
    if (error instanceof MCPError) {
      throw error;
    }
    // Convert unexpected errors to MCPError
    throw new MCPError(
      `Internal error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
      'INTERNAL_ERROR'
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  // Log startup information (to stderr to avoid interfering with stdio protocol)
  console.error(`[STARTUP] Oasis Hub MCP Server v0.1.0`);
  console.error(`[STARTUP] Registered tools: ${tools.map(t => t.name).join(', ')}`);
  console.error(`[STARTUP] Outlook integration: ${OUTLOOK_TOKEN ? 'enabled' : 'disabled'}`);
  console.error(`[STARTUP] GitHub integration: ${GITHUB_TOKEN ? 'enabled' : 'disabled'}`);
  console.error(`[STARTUP] Notion integration: ${NOTION_TOKEN ? 'enabled' : 'disabled'}`);
  console.error(`[STARTUP] Starting stdio transport...`);
  
  await server.connect(transport);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('[SHUTDOWN] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[SHUTDOWN] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error('[FATAL] Failed to start server:', error);
  process.exit(1);
});