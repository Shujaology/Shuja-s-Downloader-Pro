import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startApiServer } from './api.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apiServer = await startApiServer();
const viteCli = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = spawn(process.execPath, [viteCli, '--host', '127.0.0.1'], {
  cwd: root,
  stdio: 'inherit',
});

let shuttingDown = false;
const stop = signal => {
  if (shuttingDown) return;
  shuttingDown = true;
  vite.kill(signal);
  apiServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
vite.on('error', error => {
  console.error('Could not start Vite:', error);
  stop('SIGTERM');
});
vite.on('exit', code => {
  if (!shuttingDown) {
    shuttingDown = true;
    apiServer.close();
    process.exit(code ?? 1);
  }
});
