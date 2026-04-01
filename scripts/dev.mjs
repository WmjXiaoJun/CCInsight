#!/usr/bin/env node
/**
 * CCInsight Dev Launcher
 * Starts both frontend and backend dev servers in parallel.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FRONTEND_PORT = 5288;
const BACKEND_PORT = 4747;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => resolve(false));
  });
}

async function waitForPort(port, label, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const available = await checkPort(port);
    if (available) {
      console.log(`\n✓ ${label} is ready at http://localhost:${port}`);
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`\n✗ ${label} failed to start within ${timeout}ms`);
  return false;
}

function runCommand(cmd, args, label, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.on('exit', (code) => {
    console.error(`[${label}] Process exited with code ${code}`);
  });
  child.on('error', (err) => {
    console.error(`[${label}] Error:`, err.message);
  });
  return child;
}

async function killPort(port) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const proc = spawn('netstat', ['-ano'], { shell: true });
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.on('close', () => {
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes(`:${port}`) && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            console.log(`Killing process ${pid} on port ${port}...`);
            spawn('taskkill', ['/PID', pid, '/F'], { shell: true }).on('close', () => resolve());
            return;
          }
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function main() {
  console.log('\n🚀 CCInsight Dev Launcher\n');
  console.log(`  Frontend: http://localhost:${FRONTEND_PORT}`);
  console.log(`  Backend:  http://localhost:${BACKEND_PORT}\n`);

  // Kill any existing processes on these ports
  console.log('Checking for existing processes...\n');
  await Promise.all([
    killPort(FRONTEND_PORT),
    killPort(BACKEND_PORT),
  ]);
  await new Promise((r) => setTimeout(r, 1000));

  console.log('Starting servers...\n');

  // Start frontend
  console.log('[frontend] Starting...');
  runCommand('pnpm', ['dev'], 'frontend', resolve(ROOT, 'frontend'));

  // Start backend
  console.log('[backend] Starting...');
  runCommand('pnpm', ['dev:serve'], 'backend', resolve(ROOT, 'backend'));

  // Wait for both
  console.log('\nWaiting for servers to be ready...\n');

  const [frontendOk, backendOk] = await Promise.all([
    waitForPort(FRONTEND_PORT, 'Frontend'),
    waitForPort(BACKEND_PORT, 'Backend'),
  ]);

  console.log('\n🎉 All servers are running!\n');
  console.log('  Frontend: http://localhost:' + FRONTEND_PORT);
  console.log('  Backend:  http://localhost:' + BACKEND_PORT + '\n');
  console.log('Press Ctrl+C to stop all servers.\n');

  // Keep running
  await new Promise(() => {});
}

main().catch(console.error);
