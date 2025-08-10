#!/usr/bin/env node

/**
 * Slack Integration Test Suite (MCP stdio)
 *
 * Validates Slack tools:
 *  - slack_list_conversations
 *  - slack_post_message
 *  - slack_get_history
 *  - slack_open_conversation (smoke only if configured)
 *
 * Prerequisites:
 *  - SLACK_BOT_TOKEN in backend/.env (or environment)
 *  - Bot should be a member of at least one channel (e.g., #general)
 *
 * Run: node integration-tests/slack-integration.test.js
 */

import { spawn } from 'child_process';
import { config as dotenvConfig } from 'dotenv';

// Load backend/.env for this test process too (server already loads its own)
dotenvConfig();

function hasSlackToken() {
  // The server loads dotenv, but we also check environment to decide skip vs run
  return !!process.env.SLACK_BOT_TOKEN;
}

// If still missing here, server may still load it from its own dotenv in index.ts
if (!hasSlackToken()) console.log('⚠️  SLACK_BOT_TOKEN not present in test env; relying on server .env');

const server = spawn('npm', ['run', 'dev'], { stdio: ['pipe', 'pipe', 'inherit'], cwd: process.cwd() });

function rpc(method, params) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1e9);
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    const onData = (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim().startsWith('{')) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            server.stdout.off('data', onData);
            resolve(msg);
          }
        } catch {}
      }
    };
    server.stdout.on('data', onData);
  });
}

async function main() {
  console.log('🚀 STARTING SLACK INTEGRATION TESTS');

  // Initialize MCP
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'slack-test', version: '1.0.0' } });

  // List conversations
  let r = await rpc('tools/call', { name: 'slack_list_conversations', arguments: { limit: 50 } });
  if (r.error) {
    console.log('❌ list_conversations error:', r.error.message);
    // If token not configured, exit early as skipped
    if (r.error.message.includes('Slack token not configured') || r.error.message.includes('Slack bot token not configured')) {
      console.log('⚠️  Skipping Slack tests due to missing token.');
      server.kill();
      process.exit(0);
    }
    throw new Error(r.error.message);
  }
  const channels = r.result?.content?.[0]?.data?.channels || r.result?.channels || r.result?.result?.channels || r.result?.data?.channels || r.result?.channels || [];
  console.log(`✅ conversations listed: ${Array.isArray(channels) ? channels.length : 'unknown'} channels`);

  // Pick a channel: prefer #general where is_member === true
  let target = null;
  if (Array.isArray(channels)) {
    target = channels.find((c) => c.name === 'general' && c.is_member) || channels.find((c) => c.is_member) || null;
  }

  if (!target) {
    console.log('⚠️  No member channels found; skipping post/history tests.');
    server.kill();
    process.exit(0);
  }

  // Post a message (gracefully skip if not_in_channel or missing_scope)
  const text = `Integration test message ${Date.now()}`;
  r = await rpc('tools/call', { name: 'slack_post_message', arguments: { channel: target.id, text } });
  if (r.error) {
    const msg = r.error.message || '';
    if (msg.includes('not_in_channel') || msg.includes('missing_scope')) {
      console.log(`⚠️  post_message skipped: ${msg}`);
      server.kill();
      process.exit(0);
    }
    throw new Error('post_message failed: ' + msg);
  }
  const ts = r.result?.content?.[0]?.data?.messageTs || r.result?.messageTs;
  console.log(`✅ posted to ${target.name} (${target.id}) ts=${ts}`);

  // Get history
  r = await rpc('tools/call', { name: 'slack_get_history', arguments: { channel: target.id, limit: 20 } });
  if (r.error) {
    const msg = r.error.message || '';
    if (msg.includes('missing_scope') || msg.includes('not_in_channel')) {
      console.log(`⚠️  history skipped: ${msg}`);
      server.kill();
      process.exit(0);
    }
    throw new Error('get_history failed: ' + msg);
  }
  const messages = r.result?.content?.[0]?.data?.messages || r.result?.messages || [];
  const found = Array.isArray(messages) && messages.some((m) => (m.text || '').includes(text));
  console.log(`✅ history fetched (${Array.isArray(messages) ? messages.length : 0} msgs), foundPosted=${found}`);

  // Validation: missing channel should error
  r = await rpc('tools/call', { name: 'slack_get_history', arguments: { limit: 5 } });
  if (!r.error) throw new Error('Expected error for missing channel but got success');
  console.log('✅ validation error (missing channel) surfaced');

  // Optional: open conversation smoke if env provides a user id
  if (process.env.SLACK_TEST_DM_USER) {
    const users = process.env.SLACK_TEST_DM_USER;
    r = await rpc('tools/call', { name: 'slack_open_conversation', arguments: { users } });
    if (r.error) console.log('⚠️  open_conversation error (non-fatal):', r.error.message);
    else console.log('✅ open_conversation ok');
  }

  server.kill();
}

main().catch((e) => { console.error(e); server.kill(); process.exit(1); });

