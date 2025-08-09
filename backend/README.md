# Oasis Hub - MCP Server

Backend API server for hackathon demo. Provides Outlook integration, terminal execution, and optional GitHub/Notion integration.

## Quick Start

```bash
npm install
npm run dev    # Starts server on stdio
```

## Available Endpoints

### Working Endpoints

### Outlook Calendar Endpoints (Requires OUTLOOK_TOKEN)

#### calendar.list@v1
Lists calendar events with filtering options.
Input:
```json
{
  "calendarId": "optional-calendar-id",
  "start": "2024-08-01T00:00:00Z",
  "end": "2024-08-31T23:59:59Z", 
  "query": "meeting",
  "limit": 10,
  "orderBy": "start"
}
```

#### calendar.create@v1
Creates new calendar events.
Input:
```json
{
  "subject": "Team Meeting",
  "start": "2024-08-09T10:00:00Z",
  "end": "2024-08-09T11:00:00Z",
  "body": "Weekly sync meeting",
  "location": "Conference Room A",
  "attendees": [
    {"email": "user@example.com", "type": "required"}
  ],
  "isOnlineMeeting": false,
  "reminderMinutesBeforeStart": 15
}
```

#### calendar.delete@v1
Deletes calendar events.
Input:
```json
{
  "eventId": "AAMkADNkYmFkY2ZhLWExN2MtNGZmNi1hMGNiLWQwM...",
  "calendarId": "optional-calendar-id"
}
```

#### calendar.cancel@v1 / calendar.accept@v1 / calendar.tentative@v1 / calendar.decline@v1
Responds to calendar invitations.
Input:
```json
{
  "eventId": "AAMkADNkYmFkY2ZhLWExN2MtNGZmNi1hMGNiLWQwM...",
  "comment": "Optional response comment"
}
```

### Outlook Email Endpoints (Requires OUTLOOK_TOKEN)

#### email.list@v1
Lists emails with filtering options.
Input:
```json
{
  "from": "sender@example.com",
  "unreadOnly": true,
  "limit": 20,
  "orderBy": "receivedDateTime desc"
}
```

#### email.search@v1
Searches emails by content.
Input:
```json
{
  "query": "project update",
  "limit": 10
}
```

#### email.read@v1
Reads specific email content.
Input:
```json
{
  "messageId": "AAMkADNkYmFkY2ZhLWExN2MtNGZmNi1hMGNiLWQwM..."
}
```

#### email.send@v1
Sends new emails.
Input:
```json
{
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "subject": "Project Update",
  "body": "Email content here",
  "format": "html",
  "attachments": [
    {
      "filename": "report.pdf",
      "contentBytes": "base64-encoded-content",
      "mimeType": "application/pdf"
    }
  ]
}
```

### terminal.execute@v1 (Always Available)
Executes shell commands locally.
Input:
```json
{
  "command": "ls -la",
  "cwd": "/tmp"
}
```
Output:
```json
{
  "content": [{
    "type": "json",
    "data": {
      "command": "ls -la",
      "cwd": "/tmp",
      "exitCode": 0,
      "stdout": "total 8\ndrwxr-xr-x...",
      "stderr": "",
      "timestamp": "2024-08-09T12:00:00Z",
      "mode": "local"
    }
  }]
}
```

### github.create_issue@v1 (Requires GITHUB_TOKEN)
Creates GitHub issues.
Input:
```json
{
  "owner": "username",
  "repo": "repository",
  "title": "Bug report",
  "body": "Issue description",
  "labels": ["bug", "priority-high"]
}
```
Output:
```json
{
  "content": [{
    "type": "json",
    "data": {
      "url": "https://github.com/username/repository/issues/123",
      "number": 123,
      "title": "Bug report"
    }
  }]
}
```

### notion.get_page@v1 (Requires NOTION_TOKEN)
Retrieves Notion page content.
Input:
```json
{
  "page_id": "abc123-def456-ghi789"
}
```
Output:
```json
{
  "content": [{
    "type": "json",
    "data": {
      "title": "Page Title",
      "content": "Page text content...",
      "created_time": "2024-08-09T10:00:00Z",
      "last_edited_time": "2024-08-09T12:00:00Z"
    }
  }]
}
```

## Client Integration

### Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "oasis-frontend", "version": "1.0.0" }
  }
}
```

### Call Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "terminal.execute@v1",
    "arguments": {
      "command": "pwd",
      "cwd": "/Users"
    }
  }
}
```

### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/list"
}
```

## ⚡ Error Responses

All endpoints return structured errors:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": 400,
    "message": "Invalid command: blocked for security",
    "data": {
      "type": "BadRequestError",
      "details": "Command contains blocked pattern: sudo"
    }
  }
}
```

**Error Codes**:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limit (too many requests)
- `500` - Internal Error (server issue)

## Security Features

- Terminal blocks dangerous commands (sudo, rm -rf /, etc.)
- Tokens never returned in responses
- All inputs validated with JSON schemas
- 30-second timeout limit on terminal commands

## Testing

46 total tests - all passing

```bash
npm run test:unit       # Unit tests (14/14) - Vitest
npm run test:integration # Terminal tests (19/20) - Shell commands  
npm run test:outlook    # Outlook tests (13/13) - Live API integration
npm run test:all        # All 46 tests
```

Test coverage:
- 14 unit tests: handler logic, validation, error handling
- 19 terminal tests: command execution, security, file operations  
- 13 outlook tests: live API integration, calendar/email operations

Integration status:
- Calendar operations: 4/4 (list, create, delete, responses)
- Email operations: 3/4 (list, search, read - send requires Mail.Send permission)
- Terminal operations: 19/20 (comprehensive command validation)
- Input validation: 5/5 (robust security and error handling)

## Environment Variables

Create `.env` file:
```env
OUTLOOK_TOKEN=eyJ0eXAiOiJKV1Q...  # Required: enables Outlook calendar/email
GITHUB_TOKEN=ghp_xxx             # Optional: enables GitHub tools  
NOTION_TOKEN=secret_xxx          # Optional: enables Notion tools
```

Get Outlook Token:
1. Visit Microsoft Graph Explorer (https://developer.microsoft.com/graph/graph-explorer)
2. Sign in with your account
3. Grant permissions: Calendars.ReadWrite, Mail.Read, Mail.Send (optional)
4. Copy the access token from the request headers

## Deployment

```bash
npm run build
npm start              # Production mode
```

Server communicates via stdio - spawn as child process and use stdin/stdout for JSON-RPC messages.