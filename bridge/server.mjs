#!/usr/bin/env node
// CART local bridge: lets the extension use your logged-in Claude Code CLI instead of an API key.
// Listens on 127.0.0.1 only. Run: npm run bridge
import http from 'node:http';
import { spawn } from 'node:child_process';
import os from 'node:os';

const PORT = Number(process.env.CART_BRIDGE_PORT || 8787);
const CLAUDE_BIN = process.env.CART_CLAUDE_BIN || 'claude';
const ALLOWED_ORIGIN = /^chrome-extension:\/\//;

function runClaude({ system, user, model }) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--system-prompt', system];
    if (model) args.push('--model', model);
    const child = spawn(CLAUDE_BIN, args, { cwd: os.tmpdir(), env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude CLI timed out')); }, 120000);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out);
        if (j.is_error) return reject(new Error(j.result || 'claude CLI error'));
        resolve(j.result);
      } catch (e) { reject(new Error(`claude CLI exit ${code}: ${(err || out).slice(0, 300)}`)); }
    });
    child.stdin.end(user);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGIN.test(origin)) { res.writeHead(403); return res.end(); }
  const send = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json', ...(origin ? { 'access-control-allow-origin': origin } : {}) });
    res.end(JSON.stringify(obj));
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, GET', 'access-control-allow-headers': 'content-type' });
    return res.end();
  }
  if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
  if (req.method === 'POST' && req.url === '/roast') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 200000) req.destroy(); });
    req.on('end', async () => {
      const t0 = Date.now();
      try {
        const { system, user, model } = JSON.parse(body);
        const text = await runClaude({ system, user, model });
        console.log(`[cart-bridge] roast ok in ${Date.now() - t0} ms (${model || 'default model'})`);
        send(200, { text });
      } catch (e) {
        console.error('[cart-bridge] roast failed:', e.message);
        send(500, { error: e.message });
      }
    });
    return;
  }
  send(404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`[cart-bridge] listening on http://127.0.0.1:${PORT}`));
