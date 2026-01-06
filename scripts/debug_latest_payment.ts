
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Debugging Latest Payment ---');

  const latest = await prisma.attendee.findFirst({
    orderBy: { registeredAt: 'desc' },
    include: { user: true, event: true }
  });

  if (!latest) {
      console.log('No attendees found.');
      return;
  }

  console.log('Latest Attendee Record:');
  console.log(`ID: ${latest.id}`);
  console.log(`User: ${latest.user?.username}`);
  console.log(`Event: ${latest.event.title}`);
  console.log(`Status: ${latest.status}`);
  console.log(`PaymentStatus: ${latest.paymentStatus}`);
  console.log(`PIDX: ${latest.pidx || 'MISSING'}`);
  console.log(`Fee: ${latest.platformFee}`);
  console.log(`RegisteredAt: ${latest.registeredAt}`);
  
  // Checking Payment Method Configuration (Env check via code)
  console.log('\n--- Config Check ---');
  // Accessing process.env inside the script execution context
  console.log(`KHALTI_RETURN_URL (Env): ${process.env.KHALTI_RETURN_URL}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
