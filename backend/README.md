# Oasis Hub - MCP Server

A single-process MCP (Model Context Protocol) server exposing three tools via stdio transport for hackathon demos.

## Overview

**oasis-hub** is a TypeScript MCP server that provides:
- Zero-auth ICS calendar generation (guaranteed on-stage success)
- GitHub issue creation (conditional on token)
- Notion page retrieval with caching (conditional on token)
- Job status tracking and progress reporting

## Features

- **Transport**: stdio via @modelcontextprotocol/sdk
- **Validation**: AJV schema validation with typed errors
- **Security**: Secrets never leave server, input sanitization
- **Reliability**: Progress events, traceable logs, LRU cache
- **Extensibility**: Versioned tools, centralized registry

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

3. **Run in development**:
   ```bash
   pnpm dev
   ```

4. **Build for production**:
   ```bash
   pnpm build
   pnpm start
   ```

5. **Run tests**:
   ```bash
   pnpm test
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | Enables github.create_issue@v1 tool |
| `NOTION_TOKEN` | No | Enables notion.get_page@v1 tool |
| `WS_SERVER_URL` | No | Reserved for future WebSocket transport |

**Security**: If tokens are missing, corresponding tools won't be registered.

## Available Tools

### 1. calendar.create_ics@v1 ✅ Always Available
Creates RFC 5545 compliant ICS calendar files.

```json
{
  "title": "My Calendar",
  "events": [
    {
      "summary": "Team Meeting",
      "start": "2024-01-15T10:00:00Z",
      "end": "2024-01-15T11:00:00Z",
      "description": "Weekly sync",
      "location": "Conference Room A"
    }
  ]
}
```

### 2. github.create_issue@v1 🔐 Token Required
Creates issues in GitHub repositories.

```json
{
  "owner": "myorg",
  "repo": "myrepo",
  "title": "Bug report",
  "body": "Description of the issue",
  "labels": ["bug", "priority:high"],
  "assignees": ["username"]
}
```

### 3. notion.get_page@v1 🔐 Token Required
Retrieves Notion pages with 2-minute LRU cache.

```json
{
  "pageId": "550e8400-e29b-41d4-a716-446655440000",
  "includeChildren": true
}
```

### 4. status.get_job@v1 ✅ Always Available
Gets job status by ID.

```json
{
  "jobId": "job-123"
}
```

### 5. status.list_jobs@v1 ✅ Always Available
Lists jobs with optional filtering.

```json
{
  "status": "completed",
  "limit": 10
}
```

## Architecture

```
src/
├── index.ts              # Server bootstrap & tool registration
├── handlers/
│   ├── calendar.ts       # ICS generation (no external APIs)
│   ├── github.ts         # GitHub issue creation
│   ├── notion.ts         # Notion page retrieval + cache
│   └── status.ts         # Job status tracking
└── utils/
    ├── ajv.ts           # Schema validation
    ├── cache.ts         # LRU cache with TTL
    ├── errors.ts        # Typed error constructors
    ├── ics.ts           # RFC 5545 ICS builder
    ├── jobs.ts          # In-memory job registry
    └── logger.ts        # Progress + trace logging
```

## Logging & Tracing

All operations are traced with UUIDs and include:
- **START**: Tool invocation with redacted args
- **PROGRESS**: Step-by-step updates (`PROGRESS:2/3 creating`)
- **OK/ERR**: Completion with latency in milliseconds

**Redaction**: Automatically redacts `token`, `auth`, `password` fields.

## Error Handling

Typed errors with deterministic codes:
- `BAD_REQUEST`: Validation failures
- `UNAUTHORIZED`: Missing/invalid tokens  
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT`: API limits hit
- `INTERNAL_ERROR`: Unexpected failures

## Development

- **Language**: TypeScript with ES modules
- **Runtime**: Node.js 18+
- **Testing**: Vitest
- **Build**: tsc
- **Package Manager**: pnpm

## Production Deployment

The server runs as a single process communicating via stdio:

```bash
# Build
pnpm build

# Run
pnpm start
```

## License

Built for hackathon demonstrations.
