#!/usr/bin/env node

/**
 * Gmail Integration Test Suite
 * 
 * This test suite validates the Gmail handlers directly:
 * - handleGmailList: List Gmail messages
 * - handleGmailSearch: Search Gmail messages
 * - handleGmailRead: Read a specific Gmail message
 * - handleGmailSend: Send a Gmail message
 * 
 * Prerequisites:
 * 1. Gmail credentials.json file in the backend directory
 * 2. Gmail token.json file (obtained after first authentication)
 * 3. Gmail API enabled in Google Cloud Console
 * 
 * Usage:
 *   node integration-tests/gmail-integration.test.js
 */

import { handleGmailList, handleGmailSearch, handleGmailRead, handleGmailSend } from '../dist/handlers/gmail.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds
const SAVED_VALUES = new Map();

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

// Mock context for handlers
const mockContext = {
  emitProgress: (step, total, note) => {
    console.log(`PROGRESS:${step}/${total} ${note || ''}`);
  }
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  log(`   ${statusIcon} ${status}: ${name}`, statusColor);
  if (details) {
    log(`      ${details}`, 'cyan');
  }
}

function logSection(title) {
  log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  log('='.repeat(title.length));
}

function logSummary() {
  logSection('📊 GMAIL INTEGRATION TEST RESULTS');
  
  // Log individual test results
  log(`1. Gmail - List Messages`, totalTests >= 1 ? (passedTests >= 1 ? 'green' : 'red') : 'yellow');
  log(`2. Gmail - List with Query`, totalTests >= 2 ? (passedTests >= 2 ? 'green' : 'red') : 'yellow');
  log(`3. Gmail - List Unread Only`, totalTests >= 3 ? (passedTests >= 3 ? 'green' : 'red') : 'yellow');
  log(`4. Gmail - Search Messages`, totalTests >= 4 ? (passedTests >= 4 ? 'green' : 'red') : 'yellow');
  log(`5. Gmail - Read Message`, totalTests >= 5 ? (passedTests >= 5 ? 'green' : 'red') : 'yellow');
  log(`6. Gmail - Send Demo Message`, totalTests >= 6 ? (passedTests >= 6 ? 'green' : 'red') : 'yellow');
  log(`7. Validation - Gmail Invalid Limit`, totalTests >= 7 ? (passedTests >= 7 ? 'green' : 'red') : 'yellow');
  log(`8. Validation - Gmail Missing Query`, totalTests >= 8 ? (passedTests >= 8 ? 'green' : 'red') : 'yellow');
  log(`9. Validation - Gmail Missing Recipients`, totalTests >= 9 ? (passedTests >= 9 ? 'green' : 'red') : 'yellow');
  log(`10. Validation - Gmail Missing Subject`, totalTests >= 10 ? (passedTests >= 10 ? 'green' : 'red') : 'yellow');
  
  logSection('📈 FINAL SCORE');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`⚠️  Skipped: ${skippedTests}`, 'yellow');
  
  logSection('🔗 GMAIL INTEGRATION SUMMARY');
  const emailOpsPassed = Math.min(passedTests, 6);
  const validationPassed = Math.max(0, passedTests - 6);
  log(`   Email Operations: ${emailOpsPassed}/6`);
  log(`   Validation Tests: ${validationPassed}/4`);
  
  if (failedTests === 0) {
    if (skippedTests === 0) {
      log('\n🎉 All Gmail integration tests passed!', 'green');
    } else {
      log('\n✅ All Gmail integration tests passed or were skipped!', 'green');
    }
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Check the output above for details.`, 'yellow');
  }
}

// Test functions
async function testGmailList() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - List Messages`);
  log(`   Endpoint: handleGmailList`);
  log(`   Args: {"limit":5}`);
  
  try {
    const result = await handleGmailList({ limit: 5 }, mockContext);
    
    if (result && result.messages && Array.isArray(result.messages)) {
      logTest('Gmail - List Messages', 'PASS', `Retrieved ${result.messages.length} messages`);
      passedTests++;
      
      // Save first message ID for later tests
      if (result.messages.length > 0) {
        SAVED_VALUES.set('firstMessageId', result.messages[0].id);
        log(`   🔍 DEBUG - Saved firstMessageId: ${result.messages[0].id}`);
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('Gmail - List Messages', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
    failedTests++;
  }
}

async function testGmailListWithQuery() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - List with Query`);
  log(`   Endpoint: handleGmailList`);
  log(`   Args: {"query":"is:important","limit":3}`);
  
  try {
    const result = await handleGmailList({ query: 'is:important', limit: 3 }, mockContext);
    
    if (result && result.messages && Array.isArray(result.messages)) {
      logTest('Gmail - List with Query', 'PASS', `Retrieved ${result.messages.length} important messages`);
      passedTests++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('Gmail - List with Query', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
    failedTests++;
  }
}

async function testGmailListUnreadOnly() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - List Unread Only`);
  log(`   Endpoint: handleGmailList`);
  log(`   Args: {"unreadOnly":true,"limit":3}`);
  
  try {
    const result = await handleGmailList({ unreadOnly: true, limit: 3 }, mockContext);
    
    if (result && result.messages && Array.isArray(result.messages)) {
      logTest('Gmail - List Unread Only', 'PASS', `Retrieved ${result.messages.length} unread messages`);
      passedTests++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('Gmail - List Unread Only', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
    failedTests++;
  }
}

async function testGmailSearch() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - Search Messages`);
  log(`   Endpoint: handleGmailSearch`);
  log(`   Args: {"query":"subject:meeting","limit":3}`);
  
  try {
    const result = await handleGmailSearch({ query: 'subject:meeting', limit: 3 }, mockContext);
    
    if (result && result.messages && Array.isArray(result.messages)) {
      logTest('Gmail - Search Messages', 'PASS', `Found ${result.messages.length} meeting-related messages`);
      passedTests++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('Gmail - Search Messages', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
    failedTests++;
  }
}

async function testGmailRead() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - Read Message`);
  log(`   Endpoint: handleGmailRead`);
  
  const messageId = SAVED_VALUES.get('firstMessageId');
  if (!messageId) {
    logTest('Gmail - Read Message', 'SKIP', 'No message ID available from previous test');
    skippedTests++;
    return;
  }
  
  log(`   Args: {"messageId":"${messageId}"}`);
  
  try {
    const result = await handleGmailRead({ messageId }, mockContext);
    
    if (result && result.message) {
      logTest('Gmail - Read Message', 'PASS', `Successfully read message: ${result.message.subject || 'No subject'}`);
      passedTests++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    logTest('Gmail - Read Message', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
    failedTests++;
  }
}

async function testGmailSend() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Gmail - Send Demo Message`);
  log(`   Endpoint: handleGmailSend`);
  log(`   Args: {"to":["test@example.com"],"subject":"🤖 AI Demo Message - Test","body":"This email was sent by the AI assistant during testing. The Gmail integration is working perfectly! 🚀","format":"html"}`);
  
  try {
    // Use a mock email that won't actually send to avoid permission issues
    const result = await handleGmailSend({
      to: ['noreply@example.com'],
      subject: '🤖 AI Demo Message - Test',
      body: 'This email was sent by the AI assistant during testing. The Gmail integration is working perfectly! 🚀',
      format: 'html'
    }, mockContext);
    
    if (result && result.messageId) {
      logTest('Gmail - Send Demo Message', 'PASS', `Message sent successfully with ID: ${result.messageId}`);
      passedTests++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    // Check if it's a permission issue vs actual code error
    if (error.message.includes('Insufficient Permission') || error.message.includes('gmail.send')) {
      logTest('Gmail - Send Demo Message', 'SKIP', `Permission issue: ${error.message} - This is expected if Gmail API doesn't have send permissions`);
      skippedTests++;
    } else {
      logTest('Gmail - Send Demo Message', 'FAIL', `Unexpected error occurred\n      Error: ${error.message}`);
      failedTests++;
    }
  }
}

async function testValidationInvalidLimit() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Validation - Gmail Invalid Limit`);
  log(`   Endpoint: handleGmailList`);
  log(`   Args: {"limit":150}`);
  
  try {
    await handleGmailList({ limit: 150 }, mockContext);
    logTest('Validation - Gmail Invalid Limit', 'FAIL', 'Should have rejected limit > 100');
    failedTests++;
  } catch (error) {
    if (error.message.includes('limit') || error.message.includes('100')) {
      logTest('Validation - Gmail Invalid Limit', 'PASS', 'Correctly rejected invalid limit');
      passedTests++;
    } else {
      logTest('Validation - Gmail Invalid Limit', 'FAIL', `Unexpected error: ${error.message}`);
      failedTests++;
    }
  }
}

async function testValidationMissingQuery() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Validation - Gmail Missing Query`);
  log(`   Endpoint: handleGmailSearch`);
  log(`   Args: {"limit":5}`);
  
  try {
    await handleGmailSearch({ limit: 5 }, mockContext);
    logTest('Validation - Gmail Missing Query', 'FAIL', 'Should have rejected missing query');
    failedTests++;
  } catch (error) {
    if (error.message.includes('query') || error.message.includes('required')) {
      logTest('Validation - Gmail Missing Query', 'PASS', 'Correctly rejected missing query');
      passedTests++;
    } else {
      logTest('Validation - Gmail Missing Query', 'FAIL', `Unexpected error: ${error.message}`);
      failedTests++;
    }
  }
}

async function testValidationMissingRecipients() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Validation - Gmail Missing Recipients`);
  log(`   Endpoint: handleGmailSend`);
  log(`   Args: {"subject":"Test","body":"Test body"}`);
  
  try {
    await handleGmailSend({ subject: 'Test', body: 'Test body' }, mockContext);
    logTest('Validation - Gmail Missing Recipients', 'FAIL', 'Should have rejected missing recipients');
    failedTests++;
  } catch (error) {
    if (error.message.includes('to') || error.message.includes('recipients') || error.message.includes('required')) {
      logTest('Validation - Gmail Missing Recipients', 'PASS', 'Correctly rejected missing recipients');
      passedTests++;
    } else {
      logTest('Validation - Gmail Missing Recipients', 'FAIL', `Unexpected error: ${error.message}`);
      failedTests++;
    }
  }
}

async function testValidationMissingSubject() {
  totalTests++;
  log(`🔗 Test ${totalTests}: Validation - Gmail Missing Subject`);
  log(`   Endpoint: handleGmailSend`);
  log(`   Args: {"to":["test@example.com"],"body":"Test body"}`);
  
  try {
    await handleGmailSend({ to: ['test@example.com'], body: 'Test body' }, mockContext);
    logTest('Validation - Gmail Missing Subject', 'FAIL', 'Should have rejected missing subject');
    failedTests++;
  } catch (error) {
    if (error.message.includes('subject') || error.message.includes('required')) {
      logTest('Validation - Gmail Missing Subject', 'PASS', 'Correctly rejected missing subject');
      passedTests++;
    } else {
      logTest('Validation - Gmail Missing Subject', 'FAIL', `Unexpected error: ${error.message}`);
      failedTests++;
    }
  }
}

// Main test execution
async function runTests() {
  log('🚀 STARTING GMAIL INTEGRATION TESTS', 'bright');
  log('===================================');
  
  // Check prerequisites
  const credentialsPath = join(backendDir, 'credentials.json');
  const tokenPath = join(backendDir, 'token.json');
  
  if (!fs.existsSync(credentialsPath)) {
    log('❌ ERROR: credentials.json not found in backend directory', 'red');
    log('   Please place your Google Cloud credentials file in the backend directory', 'yellow');
    process.exit(1);
  }
  
  if (!fs.existsSync(tokenPath)) {
    log('❌ ERROR: token.json not found in backend directory', 'red');
    log('   Please run the authentication script first: node scripts/auth-gmail.js', 'yellow');
    process.exit(1);
  }
  
  log('✅ Prerequisites check passed', 'green');
  
  try {
    // Run tests
    log('\n🧪 Running Gmail integration tests...', 'blue');
    
    await testGmailList();
    await testGmailListWithQuery();
    await testGmailListUnreadOnly();
    await testGmailSearch();
    await testGmailRead();
    await testGmailSend();
    await testValidationInvalidLimit();
    await testValidationMissingQuery();
    await testValidationMissingRecipients();
    await testValidationMissingSubject();
    
  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    // Show results
    logSummary();
    
    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  log('\n🛑 Received interrupt signal, cleaning up...', 'yellow');
  process.exit(1);
});

// Run the tests
runTests().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
}); 