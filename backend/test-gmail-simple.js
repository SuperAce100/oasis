#!/usr/bin/env node

import { handleGmailList, handleGmailSearch, handleGmailRead } from './src/handlers/gmail.js';
import fs from 'fs';
import path from 'path';

// Mock context for testing
const mockContext = {
  traceId: 'test-' + Date.now()
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
      console.log(`   First message: ${firstMessage.snippet?.substring(0, 50)}...`);
      
      // Test 2: Read first message
      console.log('\n📖 Test 2: Reading first message...');
      const readResult = await handleGmailRead({ messageId: firstMessage.id }, mockContext);
      console.log(`✅ Success! Message subject: ${readResult.subject || 'No subject'}`);
      
      // Test 3: Search messages
      console.log('\n🔍 Test 3: Searching messages...');
      const searchResult = await handleGmailSearch({ query: 'is:important', limit: 3 }, mockContext);
      console.log(`✅ Success! Found ${searchResult.messages?.length || 0} important messages`);
      
    } else {
      console.log('   No messages found to test reading');
    }
    
    console.log('\n🎉 All Gmail tests passed! Your integration is working correctly.');
    
  } catch (error) {
    if (error.message.includes('credentials.json not found')) {
      console.log('\n❌ ERROR: Gmail credentials not found!');
      console.log('\n📁 Please place your files in the backend directory:');
      console.log('   - credentials.json (from Google Cloud Console)');
      console.log('   - token.json (generated after OAuth flow)');
      console.log('\n🔗 Get credentials from: https://console.cloud.google.com/apis/credentials');
      console.log('\n💡 Run this script again after adding the files.');
    } else if (error.message.includes('token.json not found')) {
      console.log('\n❌ ERROR: Gmail token not found!');
      console.log('\n🔐 You need to authenticate first. Run:');
      console.log('   node scripts/auth-gmail.js');
    } else {
      console.log('\n❌ ERROR:', error.message);
      console.log('\n🔍 Check your credentials and try again.');
    }
  }
}

// Run the test
testGmailIntegration(); 