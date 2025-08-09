# Oasis Hub - MCP Server

Backend API server for hackathon demo. Provides calendar generation, terminal execution, and optional GitHub/Notion integration.

## 🚀 Quick Start

```bash
npm install
npm run dev    # Starts server on stdio
```

## 📡 Available Endpoints

### `calendar.create_ics@v1` (Always Available)
**Purpose**: Generate ICS calendar files  
**Input**:
```json
{
  "title": "My Event",
  "start": "2024-08-09T10:00:00Z",
  "end": "2024-08-09T11:00:00Z",
  "description": "Optional description",
  "location": "Optional location"
}
```
**Output**:
```json
{
  "content": [{
    "type": "text",
    "text": "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:oasis-hub\n..."
  }]
}
```

### `terminal.execute@v1` (Always Available)
**Purpose**: Execute shell commands locally  
**Input**:
```json
{
  "command": "ls -la",
  "cwd": "/tmp"
}
```
**Output**:
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

### `github.create_issue@v1` (Requires GITHUB_TOKEN)
**Purpose**: Create GitHub issues  
**Input**:
```json
{
  "owner": "username",
  "repo": "repository",
  "title": "Bug report",
  "body": "Issue description",
  "labels": ["bug", "priority-high"]
}
```
**Output**:
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

### `notion.get_page@v1` (Requires NOTION_TOKEN)
**Purpose**: Retrieve Notion page content  
**Input**:
```json
{
  "page_id": "abc123-def456-ghi789"
}
```
**Output**:
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

## 🔧 Client Integration

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

## 🛡️ Security Features

- **Terminal**: Blocks dangerous commands (`sudo`, `rm -rf /`, etc.)
- **Tokens**: Never returned in responses
- **Validation**: All inputs validated with JSON schemas
- **Timeouts**: 30-second limit on terminal commands

## 🧪 Testing

```bash
npm test                # Unit tests
npm run test:integration # Terminal validation (19/20 scenarios)
npm run test:all        # Both
```

## 📝 Environment Variables

Create `.env` file:
```env
GITHUB_TOKEN=ghp_xxx    # Optional: enables GitHub tools
NOTION_TOKEN=secret_xxx # Optional: enables Notion tools
```

## 🏗️ Deployment

```bash
npm run build
npm start              # Production mode
```

Server communicates via stdio - spawn as child process and use stdin/stdout for JSON-RPC messages.