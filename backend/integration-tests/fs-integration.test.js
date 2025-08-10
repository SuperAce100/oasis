#!/usr/bin/env node

// Simple FS tool integration smoke tests
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
  // init
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'fs-test', version: '1.0.0' } });

  const tmp = '/tmp/oasis-fs-test';
  // mkdir
  let r = await rpc('tools/call', { name: 'fs_mkdir', arguments: { path: tmp, recursive: true } });
  console.log('mkdir:', r.error ? r.error.message : 'ok');
  // write
  r = await rpc('tools/call', { name: 'fs_write', arguments: { path: tmp + '/a.txt', content: 'hello' } });
  console.log('write:', r.error ? r.error.message : 'ok');
  // exists
  r = await rpc('tools/call', { name: 'fs_exists', arguments: { path: tmp + '/a.txt' } });
  console.log('exists:', JSON.stringify(r.result));
  // read
  r = await rpc('tools/call', { name: 'fs_read', arguments: { path: tmp + '/a.txt' } });
  console.log('read:', JSON.stringify(r.result));
  // dir
  r = await rpc('tools/call', { name: 'fs_dir', arguments: { path: tmp } });
  console.log('dir:', JSON.stringify(r.result));
  // move
  r = await rpc('tools/call', { name: 'fs_move', arguments: { from: tmp + '/a.txt', to: tmp + '/b.txt', overwrite: true } });
  console.log('move:', r.error ? r.error.message : 'ok');
  // complete
  r = await rpc('tools/call', { name: 'fs_complete', arguments: { input: '/tmp/oasis-fs-test/b' } });
  console.log('complete:', JSON.stringify(r.result));
  // delete
  r = await rpc('tools/call', { name: 'fs_delete', arguments: { path: tmp, recursive: true } });
  console.log('delete:', r.error ? r.error.message : 'ok');

  server.kill();
}

main().catch((e) => { console.error(e); server.kill(); process.exit(1); });

