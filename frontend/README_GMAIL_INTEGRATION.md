# Gmail Integration for Oasis Frontend

This document describes the Gmail integration that has been added to the Oasis frontend.

## Overview

The frontend now supports real Gmail integration through the backend MCP server. When Gmail credentials are properly configured in the backend, the mail app will display real emails from your Gmail account. When not configured, it gracefully falls back to showing empty results.

## Features

### ✅ Implemented
- **Real Gmail Integration**: Connect to your Gmail account via the backend MCP server
- **Email Listing**: View your Gmail messages with proper formatting
- **Email Search**: Search through your Gmail messages using Gmail's search syntax
- **Email Reading**: Read full email content with headers and body
- **Email Sending**: Send new emails through Gmail
- **Connection Status**: Visual indicator showing Gmail connection status
- **Graceful Fallback**: App works even when Gmail is not configured

### 🔄 API Routes Updated
- `/api/mail/list` - Lists Gmail messages
- `/api/mail/search` - Searches Gmail messages
- `/api/mail/read` - Reads individual Gmail messages
- `/api/mail/send` - Sends emails via Gmail

### 🎨 UI Components
- **Status Indicator**: Shows Gmail connection status in the sidebar
- **Error Handling**: Graceful error messages when Gmail is not configured
- **Loading States**: Proper loading indicators during API calls

## Setup Instructions

### 1. Backend Setup
First, ensure the backend Gmail integration is properly configured:

1. Follow the setup instructions in `backend/GMAIL_QUICK_SETUP.md`
2. Place your `credentials.json` and `token.json` files in the backend directory
3. Build the backend: `cd backend && npm run build`

### 2. Frontend Setup
The frontend will automatically detect Gmail availability:

1. Start the frontend: `cd frontend && npm run dev`
2. Open the mail app
3. Check the status indicator in the sidebar

## How It Works

### Architecture
```
Frontend Mail App → Frontend API Routes → MCP Client → Backend MCP Server → Gmail API
```

### Data Flow
1. **Frontend Components** make requests to frontend API routes
2. **API Routes** call the MCP client to communicate with the backend
3. **Backend MCP Server** handles Gmail API calls and returns data
4. **Frontend** transforms the data to match the expected format

### Error Handling
- **Gmail Not Configured**: Returns empty results instead of errors
- **Network Issues**: Graceful fallback with helpful error messages
- **API Errors**: Proper error messages displayed to users

## Gmail Search Syntax

When using the search feature, you can use Gmail's advanced search operators:

- `from:example@gmail.com` - Search emails from specific sender
- `to:example@gmail.com` - Search emails sent to specific recipient
- `subject:meeting` - Search emails with specific subject
- `is:important` - Search important emails
- `is:unread` - Search unread emails
- `has:attachment` - Search emails with attachments
- `after:2024/01/01` - Search emails after specific date
- `before:2024/12/31` - Search emails before specific date

## Troubleshooting

### Gmail Not Connected
If you see "Gmail Not Configured" in the status indicator:

1. Check that `credentials.json` exists in the backend directory
2. Check that `token.json` exists in the backend directory
3. Verify the backend is running and built: `cd backend && npm run build`
4. Check browser console for any error messages

### Empty Email List
If the email list is empty:

1. Verify Gmail credentials are correct
2. Check that the Gmail API is enabled in Google Cloud Console
3. Ensure the OAuth scope includes Gmail access
4. Try refreshing the page

### Send Email Fails
If sending emails fails:

1. Check that the Gmail API has send permissions
2. Verify the OAuth token hasn't expired
3. Check the browser console for error details

## Development

### Adding New Features
To add new Gmail features:

1. Add the handler to the backend (`backend/src/handlers/gmail.ts`)
2. Add the tool definition to the backend (`backend/src/index.ts`)
3. Create a new API route in the frontend (`frontend/app/api/mail/`)
4. Update the frontend components to use the new feature

### Testing
To test the integration:

1. Set up Gmail credentials in the backend
2. Start both backend and frontend
3. Open the mail app and verify emails load
4. Test search, read, and send functionality

## Security Notes

- Gmail credentials are stored locally in the backend
- No credentials are sent to the frontend
- All Gmail API calls go through the secure backend MCP server
- OAuth tokens are stored securely in the backend

## Future Enhancements

- [ ] Attachment support
- [ ] Email threading
- [ ] Labels and folders
- [ ] Email drafts
- [ ] Bulk operations
- [ ] Email templates
- [ ] Advanced filtering
