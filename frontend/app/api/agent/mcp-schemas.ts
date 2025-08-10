import { z } from "zod";

// Typed schemas for all MCP tools exposed by backend/src/index.ts
// These mirror the JSONSchemas defined server-side to enable TS-safe tooling on the client.

export const mcpToolSchemas = {
  list_calendar: {
    inputSchema: z
      .object({
        calendarId: z.string().optional(),
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
        query: z.string().optional(),
        includeCancelled: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        orderBy: z.enum(["start", "createdDateTime"]).optional(),
      })
      .describe("List calendar events in a time range"),
  },

  create_calendar: {
    inputSchema: z
      .object({
        calendarId: z.string().optional(),
        subject: z.string().min(1),
        body: z.string().optional(),
        start: z.string().datetime(),
        end: z.string().datetime(),
        attendees: z
          .array(
            z.object({
              email: z.string().email(),
              type: z.enum(["required", "optional"]).optional(),
            })
          )
          .optional(),
        location: z.string().optional(),
        isOnlineMeeting: z.boolean().optional(),
        onlineMeetingProvider: z.enum(["teamsForBusiness", "skypeForBusiness"]).optional(),
        reminderMinutesBeforeStart: z.number().int().min(0).optional(),
      })
      .describe("Create a new calendar event"),
  },

  delete_calendar: {
    inputSchema: z
      .object({
        eventId: z.string().min(1),
        calendarId: z.string().optional(),
        sendCancellations: z.boolean().optional(),
      })
      .describe("Permanently delete a calendar event"),
  },

  cancel_calendar: {
    inputSchema: z
      .object({
        eventId: z.string().min(1),
        calendarId: z.string().optional(),
        comment: z.string().optional(),
      })
      .describe("Cancel a meeting and notify attendees"),
  },

  accept_calendar: {
    inputSchema: z
      .object({
        eventId: z.string().min(1),
        calendarId: z.string().optional(),
        comment: z.string().optional(),
        sendResponse: z.boolean().optional(),
      })
      .describe("Accept a meeting invitation"),
  },

  tentative_calendar: {
    inputSchema: z
      .object({
        eventId: z.string().min(1),
        calendarId: z.string().optional(),
        comment: z.string().optional(),
        sendResponse: z.boolean().optional(),
      })
      .describe("Tentatively accept a meeting invitation"),
  },

  decline_calendar: {
    inputSchema: z
      .object({
        eventId: z.string().min(1),
        calendarId: z.string().optional(),
        comment: z.string().optional(),
        sendResponse: z.boolean().optional(),
      })
      .describe("Decline a meeting invitation"),
  },

  list_email: {
    inputSchema: z
      .object({
        mailboxId: z.string().optional(),
        folderId: z.string().optional(),
        query: z.string().optional(),
        from: z.string().optional(),
        unreadOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        orderBy: z.enum(["receivedDateTime", "subject"]).optional(),
      })
      .describe("List emails from a mailbox/folder"),
  },

  search_email: {
    inputSchema: z
      .object({
        mailboxId: z.string().optional(),
        query: z.string().min(1),
        from: z.string().optional(),
        to: z.string().optional(),
        subjectContains: z.string().optional(),
        since: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .describe("Full-text search over emails"),
  },

  read_email: {
    inputSchema: z
      .object({
        messageId: z.string().min(1),
        mailboxId: z.string().optional(),
        format: z.enum(["html", "text"]).optional(),
      })
      .describe("Fetch a single email with body and headers"),
  },

  send_email: {
    inputSchema: z
      .object({
        mailboxId: z.string().optional(),
        to: z.array(z.string().email()).min(1),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
        format: z.enum(["html", "text"]).optional(),
        attachments: z
          .array(
            z.object({
              filename: z.string().min(1),
              contentBytes: z.string(),
              mimeType: z.string().optional(),
            })
          )
          .optional(),
      })
      .describe("Send a new email (optionally with attachments)"),
  },

  create_github_issue: {
    inputSchema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        title: z.string().max(256),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
        assignees: z.array(z.string()).optional(),
      })
      .describe("Create a new issue in a GitHub repository"),
  },

  get_notion_page: {
    inputSchema: z
      .object({
        pageId: z
          .string()
          .regex(/^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/),
        includeChildren: z.boolean().optional(),
      })
      .describe("Retrieve a Notion page by ID with optional children blocks"),
  },

  get_job_status: {
    inputSchema: z
      .object({
        jobId: z.string(),
      })
      .describe("Get the status of a job by ID"),
  },

  list_jobs: {
    inputSchema: z
      .object({
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .describe("List jobs with optional filtering"),
  },

  execute_terminal: {
    inputSchema: z
      .object({
        command: z.string().min(1).max(500),
        cwd: z.string().max(200).optional(),
      })
      .describe("Execute shell commands locally"),
  },

  // Frontend-only proxy for terminal that hits /api/terminal to keep virtual cwd formatting
  terminal_proxy: {
    inputSchema: z
      .object({
        command: z.string().min(1).max(500),
        cwd: z.string().max(200).optional(),
      })
      .describe("Execute shell via frontend /api/terminal (for consistent UI cwd)"),
  },

  open_app: {
    inputSchema: z
      .object({
        target: z.string().min(1),
        action: z.enum(["open", "focus"]).optional(),
        hintClass: z.string().optional(),
      })
      .describe("Open an application or focus its window on the desktop (Linux only)."),
  },

  do_anything: {
    inputSchema: z
      .object({
        goal: z.string().min(1),
        maxSteps: z.number().int().min(1).max(50).optional(),
        dryRun: z.boolean().optional(),
        stepDelayMs: z.number().int().min(0).max(60000).optional(),
        screenshot: z.string().optional(),
        allowExecution: z.boolean().optional(),
      })
      .describe(
        "Spawn a computer-use agent: screenshot + vision model to propose and execute actions in a loop."
      ),
  },

  // Filesystem tools
  fs_health: {
    inputSchema: z.object({}).describe("Filesystem health and roots"),
  },

  fs_roots: {
    inputSchema: z.object({}).describe("List allowed filesystem roots"),
  },

  fs_exists: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
      })
      .describe("Check if a path exists"),
  },

  fs_stat: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
      })
      .describe("Stat a path"),
  },

  fs_dir: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
        includeHidden: z.boolean().optional(),
        limit: z.number().int().optional(),
        cursor: z.string().optional(),
      })
      .describe("List directory"),
  },

  fs_resolve: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
      })
      .describe("Resolve input path to absolute within roots"),
  },

  fs_read: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
        encoding: z.enum(["utf8", "base64"]).optional(),
        maxBytes: z.number().int().optional(),
      })
      .describe("Read file contents"),
  },

  fs_write: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
        content: z.string(),
        encoding: z.enum(["utf8", "base64"]).optional(),
        create: z.boolean().optional(),
        overwrite: z.boolean().optional(),
        mkdirp: z.boolean().optional(),
      })
      .describe("Write file contents"),
  },

  fs_mkdir: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
        recursive: z.boolean().optional(),
      })
      .describe("Create directory"),
  },

  fs_move: {
    inputSchema: z
      .object({
        from: z.string(),
        to: z.string(),
        overwrite: z.boolean().optional(),
        mkdirp: z.boolean().optional(),
        cwd: z.string().optional(),
      })
      .describe("Move/rename file or directory"),
  },

  fs_delete: {
    inputSchema: z
      .object({
        path: z.string(),
        cwd: z.string().optional(),
        recursive: z.boolean().optional(),
      })
      .describe("Delete file or directory"),
  },

  fs_find: {
    inputSchema: z
      .object({
        cwd: z.string(),
        glob: z.string().optional(),
        includeHidden: z.boolean().optional(),
        limit: z.number().int().optional(),
      })
      .describe("Find files under cwd (simple glob)"),
  },

  fs_complete: {
    inputSchema: z
      .object({
        cwd: z.string().optional(),
        input: z.string(),
      })
      .describe("Tab-complete a path-like input"),
  },
} as const;

export type MCPToolName = keyof typeof mcpToolSchemas;
