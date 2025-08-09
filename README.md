# Oasis Hub

A full-stack application featuring an MCP (Model Context Protocol) server and modern frontend.

## Project Structure

```
oasis/
├── backend/              # TypeScript MCP Server
│   ├── src/             # Server source code
│   ├── tests/           # Test suite
│   ├── package.json     # Node.js dependencies
│   └── README.md        # Backend documentation
├── frontend/            # Next.js Frontend
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   └── package.json    # Frontend dependencies
├── pyproject.toml      # Python project configuration
└── README.md          # This file
```

## Quick Start

### 1. Set up Python environment (optional, for Python tooling)

```bash
# Create and activate virtual environment
uv venv
source .venv/bin/activate  # On macOS/Linux
# .venv\Scripts\activate   # On Windows

# Install development dependencies (optional)
uv pip install -e ".[dev]"
```

### 2. Backend (MCP Server)

```bash
cd backend

# Install Node.js dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start

# Run tests
npm test
```

### 3. Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Configuration

### Backend (.env in backend/)
```bash
# Optional: GitHub integration
GITHUB_TOKEN=your_github_token_here

# Optional: Notion integration
NOTION_TOKEN=your_notion_token_here
```

## Development

- **Backend**: TypeScript MCP server with stdio transport
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Python**: Optional environment for tooling and scripts

## Available Tools (MCP Server)

1. **calendar.create_ics@v1** ✅ - ICS calendar generation (always available)
2. **github.create_issue@v1** 🔐 - GitHub issue creation (requires token)
3. **notion.get_page@v1** 🔐 - Notion page retrieval (requires token)
4. **status.get_job@v1** ✅ - Job status tracking
5. **status.list_jobs@v1** ✅ - List all jobs

## License

Built for hackathon demonstrations.