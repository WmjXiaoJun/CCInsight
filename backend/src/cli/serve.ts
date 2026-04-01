import { createServer } from '../server/api.js';

// Catch anything that would cause a silent exit
process.on('uncaughtException', (err) => {
  console.error('\n[ccinsight serve] Uncaught exception:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('\n[ccinsight serve] Unhandled rejection:', reason?.message || reason);
  if (process.env.DEBUG) console.error(reason?.stack);
  process.exit(1);
});

export const serveCommand = async (options?: { port?: string; host?: string }) => {
  const port = Number(options?.port ?? 4747);
  const host = options?.host ?? '127.0.0.1';

  try {
    await createServer(port, host);
  } catch (err: any) {
    console.error(`\nFailed to start ccinsight server:\n`);
    console.error(`  ${err.message || err}\n`);
    if (err.code === 'EADDRINUSE') {
      console.error(`  Port ${port} is already in use. Either:`);
      console.error(`    1. Stop the other process using port ${port}`);
      console.error(`    2. Use a different port: ccinsight serve --port 4748\n`);
    }
    if (err.stack && process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
};
