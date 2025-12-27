
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkEvent() {
  const event = await prisma.event.findFirst({
    where: {
      title: {
        contains: 'Summer Music Festival',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      title: true,
      price: true,
      isFree: true,
      currency: true
    }
  });

  console.log('Event Data:', JSON.stringify(event, null, 2));
}

checkEvent()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
