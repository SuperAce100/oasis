# 🚀 Gmail Integration Quick Setup

## 📁 File Placement

Place these files in the `backend/` directory:

1. **`credentials.json`** - Your Google Cloud OAuth credentials
2. **`token.json`** - Your OAuth tokens (generated after authentication)

## 🔐 Getting Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Download as `credentials.json`

## 🧪 Testing

Run the test script to verify everything works:

```bash
cd backend
node test-gmail-simple.js
```

## 🚀 Starting the Backend

```bash
cd backend
npm run dev
```

The Gmail tools will be automatically registered:
- `gmail.list@v1` - List emails
- `gmail.search@v1` - Search emails  
- `gmail.read@v1` - Read email content
- `gmail.send@v1` - Send emails

## 📋 Available Gmail Search Operators

- `from:email@domain.com` - From specific sender
- `to:email@domain.com` - To specific recipient
- `subject:keyword` - Subject contains keyword
- `has:attachment` - Has attachments
- `is:unread` - Unread messages
- `is:important` - Important messages
- `after:2024/01/01` - After date
- `before:2024/12/31` - Before date

## 🔍 Troubleshooting

- **Credentials error**: Check `credentials.json` is in backend directory
- **Token error**: Run `node scripts/auth-gmail.js` to authenticate
- **API error**: Ensure Gmail API is enabled in Google Cloud Console 