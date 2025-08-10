#!/usr/bin/env node

import { spawn } from 'child_process';

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
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'contacts-test', version: '1.0.0' } });
  let r = await rpc('tools/call', { name: 'list_contacts', arguments: { limit: 5 } });
  console.log('list_contacts:', r.error ? r.error.message : JSON.stringify(r.result));
  r = await rpc('tools/call', { name: 'search_contacts', arguments: { query: 'gmail.com', limit: 5 } });
  console.log('search_contacts:', r.error ? r.error.message : JSON.stringify(r.result));
  server.kill();
}

main().catch((e) => { console.error(e); server.kill(); process.exit(1); });

