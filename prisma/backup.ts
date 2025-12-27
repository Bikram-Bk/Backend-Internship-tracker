import { PrismaClient } from '../src/generated/prisma/index.js';
import fs from 'fs-extra';
import path from 'path';

const prisma = new PrismaClient();
const backupDir = path.join(process.cwd(), 'prisma/data');
const backupFile = path.join(backupDir, 'backup.json');

async function main() {
  console.log('📦 Starting database backup...');

  // Ensure backup directory exists
  await fs.ensureDir(backupDir);

  // Fetch data
  const users = await prisma.user.findMany();
  const categories = await prisma.category.findMany();
  const events = await prisma.event.findMany();
  const attendees = await prisma.attendee.findMany();
  
  // Construct backup object
  const backupData = {
    timestamp: new Date().toISOString(),
    users,
    categories,
    events,
    attendees
  };

  // Write to file
  await fs.writeJson(backupFile, backupData, { spaces: 2 });
  
  console.log(`✅ Backup saved to ${backupFile}`);
  console.log(`stats:
  - Users: ${users.length}
  - Categories: ${categories.length}
  - Events: ${events.length}
  - Attendees: ${attendees.length}
  `);
}

main()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
