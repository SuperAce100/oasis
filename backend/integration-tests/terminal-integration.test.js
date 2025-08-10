#!/usr/bin/env node

/**
 * Comprehensive Terminal Integration Test Suite
 * 
 * This test validates the execute_terminal endpoint with a wide variety
 * of real-world commands and scenarios. It tests:
 * - Basic shell commands (echo, pwd, ls)
 * - File operations (create, read, permissions)
 * - System information (uname, ps, df)
 * - Text processing (pipes, sort, grep)
 * - Error handling (non-existent files)
 * - Security blocking (dangerous commands)
 * - Working directory changes
 * - Network operations (ping)
 * 
 * Run with: node integration-tests/terminal-integration.test.js
 * Or: npm run test:integration
 */

import { spawn } from 'child_process';

const server = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd()
});

console.log('🧪 Comprehensive Terminal Test Suite\n');

// Test cases with expected behaviors
const tests = [
  {
    name: "Basic Echo",
    command: "echo 'Hello World!'",
    cwd: "/tmp",
    expectSuccess: true,
    expectOutput: "Hello World!"
  },
  {
    name: "Current Directory",
    command: "pwd",
    cwd: "/Users",
    expectSuccess: true,
    expectOutput: "/Users"
  },
  {
    name: "List Root Directory",
    command: "ls -la /",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "total"  // Should contain file listing
  },
  {
    name: "Environment Variables",
    command: "echo $HOME && echo $USER",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "/"  // Should show some env vars
  },
  {
    name: "File Operations - Create",
    command: "mkdir -p /tmp/test && echo 'test content' > /tmp/test/file.txt && cat /tmp/test/file.txt",
    cwd: "/tmp",
    expectSuccess: true,
    expectOutput: "test content"
  },
  {
    name: "File Operations - List",
    command: "ls -la /tmp/test/",
    cwd: "/tmp",
    expectSuccess: true,
    expectOutput: "file.txt"
  },
  {
    name: "Working Directory Change",
    command: "pwd && ls -la",
    cwd: "/tmp/test",
    expectSuccess: true,
    expectOutput: "/tmp/test"
  },
  {
    name: "System Information",
    command: "uname -a && whoami",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "Darwin"  // Should show system info
  },
  {
    name: "Process Listing",
    command: "ps aux | head -5",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "PID"  // Should show process header
  },
  {
    name: "Network Test (Local)",
    command: "ping -c 1 127.0.0.1",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "PING"
  },
  {
    name: "File Permissions",
    command: "touch /tmp/testfile && chmod 755 /tmp/testfile && ls -l /tmp/testfile",
    cwd: "/tmp",
    expectSuccess: true,
    expectOutput: "rwxr-xr-x"
  },
  {
    name: "Text Processing",
    command: "echo -e 'apple\\nbanana\\ncherry' | sort | head -2",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "apple"
  },
  {
    name: "Find Command",
    command: "find /tmp -name '*.txt' -type f || echo 'No txt files found'",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "txt"  // Should find txt files or show message
  },
  {
    name: "Disk Usage",
    command: "df -h | head -2",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "Filesystem"
  },
  {
    name: "Date and Time",
    command: "date && date +%Y-%m-%d",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "202"  // Should show current year (2024 or 2025)
  },
  {
    name: "Command Chaining Success",
    command: "echo 'first' && echo 'second' && echo 'third'",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "first"
  },
  {
    name: "Command with Pipes",
    command: "echo 'hello world test' | wc -w",
    cwd: "/",
    expectSuccess: true,
    expectOutput: "3"
  },
  {
    name: "Error Command - File Not Found",
    command: "cat /nonexistent/file/path",
    cwd: "/",
    expectSuccess: true,  // Command runs successfully but produces error output
    expectError: "No such file"
  },
  {
    name: "Security Block - sudo",
    command: "sudo echo 'blocked'",
    cwd: "/",
    expectBlocked: true
  },
  {
    name: "Security Block - rm -rf /",
    command: "rm -rf /",
    cwd: "/",
    expectBlocked: true
  }
];

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "comprehensive-test", version: "1.0.0" }
  }
}) + '\n');

let currentTest = 0;
let responseCount = 0;
let results = [];

function runNextTest() {
  if (currentTest >= tests.length) {
    printResults();
    return;
  }

  const test = tests[currentTest];
  console.log(`\n🧪 Test ${currentTest + 1}: ${test.name}`);
  console.log(`   Command: ${test.command}`);
  console.log(`   CWD: ${test.cwd}`);

  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: currentTest + 2,
    method: "tools/call",
    params: {
      name: "execute_terminal",
      arguments: {
        command: test.command,
        cwd: test.cwd
      }
    }
  }) + '\n');

  currentTest++;
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach((result, i) => {
    const test = tests[i];
    console.log(`\n${i + 1}. ${test.name}`);
    
    if (result.blocked && test.expectBlocked) {
      console.log('   ✅ PASS - Correctly blocked security threat');
      passed++;
    } else if (result.error && !test.expectSuccess) {
      console.log('   ✅ PASS - Expected error occurred');
      console.log(`      Error: ${result.error}`);
      passed++;
    } else if (result.success && test.expectSuccess) {
      // Check if this is an error test expecting stderr output
      if (test.expectError) {
        const hasExpectedError = result.stderr.includes(test.expectError);
        if (hasExpectedError) {
          console.log('   ✅ PASS - Expected error output found in stderr');
          console.log(`      Exit Code: ${result.exitCode}`);
          console.log(`      Error: ${result.stderr.substring(0, 100)}`);
          passed++;
        } else {
          console.log('   ❌ FAIL - Missing expected error output');
          console.log(`      Expected error: ${test.expectError}`);
          console.log(`      Got stderr: ${result.stderr.substring(0, 100)}`);
          failed++;
        }
      } else {
        const hasExpectedOutput = test.expectOutput ? 
          (result.stdout.includes(test.expectOutput) || result.stderr.includes(test.expectOutput)) : true;
        
        if (hasExpectedOutput) {
          console.log('   ✅ PASS - Command executed successfully');
          console.log(`      Exit Code: ${result.exitCode}`);
          console.log(`      Output: ${result.stdout.substring(0, 100)}${result.stdout.length > 100 ? '...' : ''}`);
          passed++;
        } else {
          console.log('   ❌ FAIL - Missing expected output');
          console.log(`      Expected: ${test.expectOutput}`);
          console.log(`      Got: ${result.stdout.substring(0, 100)}`);
          failed++;
        }
      }
    } else {
      console.log('   ❌ FAIL - Unexpected result');
      console.log(`      Expected success: ${test.expectSuccess}`);
      console.log(`      Got: ${JSON.stringify(result)}`);
      failed++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`📈 FINAL SCORE: ${passed}/${tests.length} tests passed`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  server.kill();
  process.exit(failed === 0 ? 0 : 1);
}

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    if (line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          // Initialization response
          console.log('✅ Server initialized, starting tests...');
          setTimeout(() => runNextTest(), 500);
          return;
        }

        responseCount++;
        const testIndex = responseCount - 1;
        
        if (response.error) {
          if (response.error.message.includes('blocked for security')) {
            results[testIndex] = { blocked: true };
            console.log('   🛡️  BLOCKED for security');
          } else {
            results[testIndex] = { error: response.error.message };
            console.log(`   ❌ ERROR: ${response.error.message}`);
          }
        } else if (response.result && response.result.content) {
          const data = response.result.content[0].data;
          results[testIndex] = {
            success: true,
            exitCode: data.exitCode,
            stdout: data.stdout,
            stderr: data.stderr,
            mode: data.mode
          };
          
          console.log(`   ✅ SUCCESS (exit: ${data.exitCode}, mode: ${data.mode})`);
          if (data.stdout) {
            const preview = data.stdout.length > 80 ? 
              data.stdout.substring(0, 80) + '...' : data.stdout;
            console.log(`      Output: ${preview}`);
          }
          if (data.stderr) {
            console.log(`      Error: ${data.stderr.substring(0, 80)}`);
          }
        }

        // Run next test after a short delay
        setTimeout(() => runNextTest(), 300);
        
      } catch (e) {
        // Ignore parse errors
      }
    }
  });
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Test suite timeout - stopping...');
  printResults();
}, 60000);