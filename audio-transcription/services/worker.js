import { run } from 'graphile-worker';

run({
  connectionString: process.env.DATABASE_URL,
  concurrency: 1, // important: you only have 1 CPU for AI
  pollInterval: 2000,
  taskDirectory: './tasks',
});
