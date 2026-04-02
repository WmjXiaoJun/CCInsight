#!/usr/bin/env node
/**
 * MCP Server Tester
 *
 * Tests the MCP server by sending JSON-RPC requests over stdio.
 *
 * Usage:
 *   node scripts/test-mcp.mjs [command] [args]
 *
 * Examples:
 *   node scripts/test-mcp.mjs tools
 *   node scripts/test-mcp.mjs list_repos
 *   node scripts/test-mcp.mjs query "authentication"
 *   node scripts/test-mcp.mjs context --name "authenticate"
 *   node scripts/test-mcp.mjs cypher "MATCH (n:Function) RETURN n LIMIT 5"
 *   node scripts/test-mcp.mjs resources
 *   node scripts/test-mcp.mjs prompts
 *
 * Environment:
 *   CCINSIGHT_BACKEND_PATH - path to ccinsight backend (default: backend/dist/index.js)
 *   CCINSIGHT_REPO_PATH   - path to indexed repo
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __file = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__file), '..');
const MCP_COMMAND = process.env.CCINSIGHT_BACKEND_PATH || resolve(ROOT, 'backend', 'dist', 'cli', 'index.js');
const REPO_PATH = process.env.CCINSIGHT_REPO_PATH || undefined;

// ─── JSON-RPC Helpers ──────────────────────────────────────────────────────────
let messageId = 1;
function nextId() { return messageId++; }

function createRequest(method, params = {}) {
  return { jsonrpc: '2.0', id: nextId(), method, params };
}

function parseResponse(data) {
  try { return JSON.parse(data); } catch { return null; }
}

// ─── StdioTransport ────────────────────────────────────────────────────────────
class StdioTransport {
  constructor(command, args = []) {
    this.command = command;
    this.args = args;
    this.proc = null;
    this.buffer = '';
    this.pendingRequests = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, ...(REPO_PATH ? { CCINSIGHT_REPO: REPO_PATH } : {}) };
      this.proc = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'], env });

      this.proc.stdout.on('data', (chunk) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.proc.stderr.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) console.error('[MCP STDERR]', text);
      });

      this.proc.on('error', reject);
      this.proc.on('exit', (code) => {
        if (code !== 0 && code !== null) console.error(`[MCP EXIT] code=${code}`);
      });

      setTimeout(resolve, 500);
    });
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const resp = parseResponse(line);
      if (!resp) continue;
      if (resp.id !== undefined) {
        const pending = this.pendingRequests.get(resp.id);
        if (pending) { pending(resp); this.pendingRequests.delete(resp.id); }
      }
    }
    this.buffer = lines[lines.length - 1];
  }

  async sendRequest(method, params = {}) {
    const req = createRequest(method, params);
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(req.id, (resp) => {
        if (resp.error) reject(new Error(`${resp.error.code}: ${resp.error.message}`));
        else resolve(resp.result);
      });
      this.proc.stdin.write(JSON.stringify(req) + '\n');
    });
  }

  stop() {
    if (this.proc) { this.proc.stdin.end(); this.proc.kill(); }
  }
}

// ─── Test Commands ────────────────────────────────────────────────────────────
async function testTools(transport) {
  console.log('\n--- Testing tools/list ---');
  const result = await transport.sendRequest('tools/list', {});
  const tools = result?.tools || [];
  console.log(`Found ${tools.length} MCP tools:`);
  for (const t of tools) {
    console.log(`  - ${t.name}: ${t.description?.slice(0, 60)}...`);
  }
}

async function testListRepos(transport) {
  console.log('\n--- Testing list_repos ---');
  const result = await transport.sendRequest('tools/call', {
    name: 'list_repos', arguments: {},
  });
  console.log(JSON.stringify(result, null, 2));
}

async function testQuery(transport, query) {
  console.log(`\n--- Testing query: "${query}" ---`);
  const result = await transport.sendRequest('tools/call', {
    name: 'query', arguments: { query, limit: 5 },
  });
  console.log(JSON.stringify(result, null, 2));
}

async function testContext(transport, name) {
  console.log(`\n--- Testing context: "${name}" ---`);
  const result = await transport.sendRequest('tools/call', {
    name: 'context', arguments: { name, depth: 2 },
  });
  console.log(JSON.stringify(result, null, 2));
}

async function testCypher(transport, cypherQuery) {
  console.log(`\n--- Testing cypher ---`);
  const result = await transport.sendRequest('tools/call', {
    name: 'cypher', arguments: { query: cypherQuery, limit: 10 },
  });
  console.log(JSON.stringify(result, null, 2));
}

async function testResources(transport) {
  console.log('\n--- Testing resources/list ---');
  const result = await transport.sendRequest('resources/list', {});
  const resources = result?.resources || [];
  console.log(`Found ${resources.length} resources:`);
  for (const r of resources) {
    console.log(`  - ${r.uri}: ${r.description?.slice(0, 60)}...`);
  }
}

async function testPrompts(transport) {
  console.log('\n--- Testing prompts/list ---');
  const result = await transport.sendRequest('prompts/list', {});
  const prompts = result?.prompts || [];
  console.log(`Found ${prompts.length} prompts:`);
  for (const p of prompts) {
    console.log(`  - ${p.name}: ${p.description?.slice(0, 60)}...`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const transport = new StdioTransport('node', [MCP_COMMAND, 'mcp']);

  console.log(`🔧 CCInsight MCP Tester`);
  console.log(`   Backend : ${MCP_COMMAND}`);
  console.log(`   Repo    : ${REPO_PATH || '(none — current dir will be used)'}`);
  console.log(`   Command : ${command}`);

  try {
    await transport.start();
    console.log('✅ MCP server started');

    switch (command) {
      case 'tools':
        await testTools(transport); break;
      case 'list_repos':
        await testListRepos(transport); break;
      case 'query':
        await testQuery(transport, args[1] || 'authentication'); break;
      case 'context':
        await testContext(transport, args[1] || 'main'); break;
      case 'cypher':
        await testCypher(transport, args.slice(1).join(' ') || 'MATCH (n) RETURN n LIMIT 5'); break;
      case 'resources':
        await testResources(transport); break;
      case 'prompts':
        await testPrompts(transport); break;
      default:
        console.log('\nAvailable commands:');
        console.log('  tools       — List all MCP tools');
        console.log('  list_repos — List indexed repositories');
        console.log('  query <q>  — Search knowledge graph');
        console.log('  context <n>— 360-degree symbol view');
        console.log('  cypher <q> — Execute raw Cypher query');
        console.log('  resources  — List MCP resources');
        console.log('  prompts    — List MCP prompts');
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('   Make sure the backend is built: pnpm run build');
    process.exit(1);
  } finally {
    transport.stop();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
