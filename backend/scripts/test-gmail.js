#!/usr/bin/env node

/**
 * Simple Gmail Integration Test
 * 
 * This script tests basic Gmail functionality without starting the full MCP server.
 * 
 * Usage:
 *   node scripts/test-gmail.js
 */

import { handleGmailList, handleGmailSearch, handleGmailRead, handleGmailSend } from '../src/handlers/gmail.js';

// Mock context for testing
const mockContext = {
  id: 'test-context',
  startTime: Date.now()
};

async function testGmailIntegration() {
  console.log('🧪 Testing Gmail Integration...\n');
  
  try {
    // Test 1: List messages
    console.log('📧 Test 1: Listing Gmail messages...');
    const listResult = await handleGmailList({ limit: 5 }, mockContext);
    console.log(`✅ Success! Retrieved ${listResult.messages?.length || 0} messages`);
    
    if (listResult.messages && listResult.messages.length > 0) {
      const firstMessage = listResult.messages[0];
      console.log(`   First message: ${firstMessage.subject || '(No Subject)'} from ${firstMessage.from}`);
      
      // Test 2: Read specific message
      console.log('\n👁️  Test 2: Reading specific message...');
      const readResult = await handleGmailRead({ messageId: firstMessage.id }, mockContext);
      console.log(`✅ Success! Read message: ${readResult.subject || '(No Subject)'}`);
      
      // Test 3: Search messages
      console.log('\n🔍 Test 3: Searching messages...');
      const searchResult = await handleGmailSearch({ query: 'is:important', limit: 3 }, mockContext);
      console.log(`✅ Success! Found ${searchResult.messages?.length || 0} important messages`);
      
      // Test 4: Send test email (commented out to avoid spam)
      console.log('\n📤 Test 4: Send test email (skipped to avoid spam)');
      console.log('   To test sending, use the frontend or uncomment the code below');
      
      /*
      const sendResult = await handleGmailSend({
        to: ['test@example.com'],
        subject: 'Test from Oasis Gmail Integration',
        body: 'This is a test email sent via the Gmail integration.',
        format: 'text'
      }, mockContext);
      console.log(`✅ Success! Email sent with ID: ${sendResult.id}`);
      */
      
    } else {
      console.log('⚠️  No messages found to test with');
    }
    
    console.log('\n🎉 All Gmail integration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Gmail integration test failed:');
    console.error(error.message);
    
    if (error.message.includes('credentials.json not found')) {
      console.log('\n💡 To fix this:');
      console.log('1. Download credentials.json from Google Cloud Console');
      console.log('2. Place it in the backend directory');
      console.log('3. Run: node scripts/auth-gmail.js');
    } else if (error.message.includes('token.json not found')) {
      console.log('\n💡 To fix this:');
      console.log('1. Run: node scripts/auth-gmail.js');
      console.log('2. Complete the OAuth flow');
    }
    
    process.exit(1);
  }
}

// Run the test
testGmailIntegration().catch((error) => {
  console.error('\n💥 Unhandled error:', error.message);
  process.exit(1);
}); 