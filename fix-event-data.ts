
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function fixEventData() {
  const event = await prisma.event.findFirst({
    where: {
      title: {
        contains: 'Summer Music Festival',
        mode: 'insensitive'
      }
    }
  });

  if (event && event.isFree && Number(event.price) > 0) {
    console.log(`Fixing event: ${event.title}. Price is ${event.price}, but isFree is true.`);
    await prisma.event.update({
      where: { id: event.id },
      data: { isFree: false }
    });
    console.log('Fixed: isFree set to false.');
  } else {
    console.log('Event not found or data already correct.');
  }
}

fixEventData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
