# Gmail Integration Setup Guide

This guide will help you set up Gmail integration with your Oasis MCP backend.

## 🚀 Quick Start

1. **Set up Google Cloud Project** (5 minutes)
2. **Download credentials** (2 minutes)  
3. **Run authentication script** (3 minutes)
4. **Test integration** (2 minutes)

## 📋 Prerequisites

- Node.js 18+ installed
- Google account with Gmail
- Basic familiarity with command line

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

### 1.2 Enable Gmail API
1. In your project, go to **"APIs & Services" > "Library"**
2. Search for **"Gmail API"**
3. Click on it and press **"Enable"**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth 2.0 Client IDs"**
3. Choose **"Desktop application"** as application type
4. Give it a name (e.g., "Oasis Gmail Integration")
5. Click **"Create"**
6. **Download** the credentials file (it will be named something like `client_secret_xxx.json`)

### 1.4 Configure OAuth Consent Screen
1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** user type
3. Fill in required fields:
   - **App name**: "Oasis Gmail Integration"
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users (your Gmail address)
6. Click **"Save and Continue"** through all sections

## 📁 Step 2: Place Credentials

1. **Rename** the downloaded file to `credentials.json`
2. **Move** it to your `backend/` directory
3. **Verify** the file structure:
   ```
   backend/
   ├── credentials.json  ← Place here
   ├── src/
   ├── package.json
   └── ...
   ```

## 🔐 Step 3: Authenticate

### 3.1 Run Authentication Script
```bash
cd backend
node scripts/auth-gmail.js
```

### 3.2 Complete OAuth Flow
1. The script will show you a URL
2. **Copy and paste** the URL into your browser
3. **Sign in** with your Google account
4. **Grant permissions** to the app
5. **Copy** the redirect URL from your browser
6. **Paste** it back into the terminal

### 3.3 Verify Success
You should see:
```
✅ Successfully connected to Gmail as: your.email@gmail.com
🎉 Gmail authentication completed successfully!
```

## 🧪 Step 4: Test Integration

### 4.1 Test Backend
```bash
cd backend
npm run test:gmail
```

### 4.2 Test Frontend
1. Start your backend: `npm run dev`
2. Start your frontend: `cd ../frontend && npm run dev`
3. Navigate to the Gmail integration component
4. Try listing messages, searching, and sending emails

## 🔧 Available Gmail Tools

Your backend now provides these MCP tools:

### 📧 `gmail.list@v1`
List Gmail messages with filtering options
```json
{
  "limit": 20,
  "unreadOnly": false,
  "query": "is:important"
}
```

### 🔍 `gmail.search@v1`
Search messages using Gmail search operators
```json
{
  "query": "from:example@gmail.com subject:meeting",
  "limit": 10
}
```

### 👁️ `gmail.read@v1`
Read a specific message by ID
```json
{
  "messageId": "18c1a2b3d4e5f6g7",
  "format": "full"
}
```

### 📤 `gmail.send@v1`
Send a new email
```json
{
  "to": ["recipient@example.com"],
  "subject": "Test Email",
  "body": "Hello from Oasis!",
  "format": "text"
}
```

## 🔍 Gmail Search Operators

Use these in search queries:

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:john@gmail.com` | Messages from specific sender |
| `to:` | `to:me@gmail.com` | Messages sent to specific recipient |
| `subject:` | `subject:meeting` | Messages with subject containing text |
| `is:` | `is:unread` | Message state (unread, read, starred, etc.) |
| `has:` | `has:attachment` | Messages with attachments |
| `filename:` | `filename:pdf` | Messages with specific file types |
| `larger:` | `larger:10M` | Messages larger than size |
| `newer:` | `newer:1d` | Messages newer than time period |

## 🚨 Troubleshooting

### Common Issues

#### 1. "Credentials file not found"
- Ensure `credentials.json` is in the `backend/` directory
- Check file permissions

#### 2. "Invalid redirect URI"
- Make sure you're using the correct OAuth client ID
- Verify the redirect URI in Google Cloud Console matches

#### 3. "Token expired"
- Run `node scripts/auth-gmail.js` again
- Choose "y" when prompted to re-authenticate

#### 4. "Insufficient permissions"
- Check that Gmail API is enabled
- Verify OAuth consent screen has correct scopes
- Ensure your email is added as a test user

#### 5. "Rate limit exceeded"
- Gmail API has quotas (1,000 requests per 100 seconds per user)
- Wait a few minutes and try again

### Debug Mode

Enable debug logging by setting environment variable:
```bash
export DEBUG=googleapis:*
npm run dev
```

## 🔒 Security Notes

- **Never commit** `credentials.json` or `token.json` to version control
- **Add to .gitignore**:
  ```
  credentials.json
  token.json
  ```
- **Rotate credentials** periodically
- **Monitor API usage** in Google Cloud Console

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Gmail API Quotas](https://developers.google.com/gmail/api/reference/quota)
- [OAuth 2.0 Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Gmail Search Operators](https://support.google.com/mail/answer/7190)

## 🎯 Next Steps

After successful setup:

1. **Explore the frontend** Gmail integration component
2. **Test all operations** (list, search, read, send)
3. **Customize the UI** to match your needs
4. **Add error handling** for production use
5. **Implement caching** for better performance

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check Google Cloud Console for errors
4. Review the integration test output
5. Check backend logs for detailed error messages

---

**Happy Gmail integration! 🚀** 