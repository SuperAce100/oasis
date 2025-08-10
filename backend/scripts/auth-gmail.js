#!/usr/bin/env node

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

const PATHS = {
  credentials: path.join(__dirname, '..', 'credentials.json'),
  token: path.join(__dirname, '..', 'token.json')
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function getAuthUrl(oAuth2Client) {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

async function getTokenFromCode(oAuth2Client, code) {
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

function saveToken(tokens) {
  fs.writeFileSync(PATHS.token, JSON.stringify(tokens, null, 2));
  log('Token saved to token.json');
}

async function main() {
  try {
    log('🔐 Gmail OAuth2 Authentication Setup');
    log('=====================================');

    // Check if credentials exist
    if (!fs.existsSync(PATHS.credentials)) {
      log('❌ credentials.json not found!');
      log('📁 Please download your OAuth2 credentials from Google Cloud Console');
      log('🔗 Visit: https://console.cloud.google.com/apis/credentials');
      log('📋 Download as credentials.json and place in the backend directory');
      return;
    }

    // Check if token already exists
    if (fs.existsSync(PATHS.token)) {
      log('✅ token.json already exists');
      log('🔄 Testing existing token...');
      
      try {
        const tokens = JSON.parse(fs.readFileSync(PATHS.token, 'utf8'));
        const oAuth2Client = new OAuth2Client();
        oAuth2Client.setCredentials(tokens);
        
        // Test the token
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        await gmail.users.getProfile({ userId: 'me' });
        log('✅ Existing token is valid! No need to re-authenticate.');
        return;
      } catch (error) {
        log('⚠️  Existing token is invalid or expired');
        log('🔄 Proceeding with new authentication...');
      }
    }

    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(PATHS.credentials, 'utf8'));
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    if (!client_id || !client_secret) {
      throw new Error('Invalid credentials.json format');
    }

    log('✅ Credentials loaded successfully');
    log(`🔑 Client ID: ${client_id.substring(0, 20)}...`);

    // Create OAuth2 client
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
    const authUrl = getAuthUrl(oAuth2Client);

    log('\n🌐 Please visit this URL to authorize the application:');
    log(authUrl);
    log('\n📱 After authorization, you will be redirected to a URL');
    log('🔗 Copy the entire redirect URL and paste it below');

    // Get authorization code from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const redirectUrl = await new Promise((resolve) => {
      rl.question('\n🔗 Paste the redirect URL here: ', resolve);
    });

    rl.close();

    // Extract authorization code
    const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
    const code = urlParams.get('code');

    if (!code) {
      throw new Error('Could not extract authorization code from redirect URL');
    }

    log('✅ Authorization code extracted');

    // Exchange code for tokens
    log('🔄 Exchanging authorization code for tokens...');
    const tokens = await getTokenFromCode(oAuth2Client, code);
    
    // Save tokens
    saveToken(tokens);
    log('✅ Authentication completed successfully!');

    // Test the connection
    log('\n🧪 Testing Gmail connection...');
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    const profile = await gmail.users.getProfile({ userId: 'me' });
    log(`✅ Connected to Gmail as: ${profile.data.emailAddress}`);
    log(`📧 Messages: ${profile.data.messagesTotal}`);
    log(`📬 Unread: ${profile.data.messagesUnread}`);

    log('\n🎉 Gmail authentication setup complete!');
    log('💡 You can now run the test script: node scripts/test-gmail-simple.js');

  } catch (error) {
    log(`❌ Error: ${error.message}`);
    if (error.code === 'ENOENT') {
      log('📁 Make sure you are running this script from the backend directory');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
}); 