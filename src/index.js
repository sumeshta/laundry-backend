import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Ensure PostgreSQL is running and DATABASE_URL is set in backend/.env');
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Laundry API listening on http://localhost:${config.port}`);
    console.log(`Health: http://localhost:${config.port}/api/v1/health`);
  });
}

main();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
