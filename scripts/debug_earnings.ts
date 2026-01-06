
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Debugging Completed Earnings ---');

  const completed = await prisma.attendee.findMany({
    where: { paymentStatus: 'COMPLETED' },
    include: {
      event: { include: { organizer: true } },
      user: true
    },
    take: 10,
    orderBy: { registeredAt: 'desc' }
  });

  console.log(`Found ${completed.length} COMPLETED transactions.`);

  for (const t of completed) {
      console.log(`\nTx ID: ${t.id} | Amount: ${t.paymentAmount}`);
      console.log(`  Payer: ${t.user.username} (${t.userId})`);
      console.log(`  Event: ${t.event.title} (${t.eventId})`);
      console.log(`  Organizer: ${t.event.organizer.username} (${t.event.organizerId})`);
      console.log(`  Organizer Role: ${t.event.organizer.role}`);
      
      // Check Organizer Balance
      const org = await prisma.user.findUnique({ where: { id: t.event.organizerId } });
      console.log(`  -> Current Org Balance: ${org?.balance}`);
      
      // Check Admin Balance (Platform Fee)
      console.log(`  -> Platform Fee Recorded: ${t.platformFee}`);
      
      // Validation
      const amount = Number(t.paymentAmount);
      const expectedFee = t.event.organizer.role === 'ADMIN' ? 0 : amount * 0.10;
      const expectedShare = amount - expectedFee;
      
      console.log(`  -> Expected Split | Org: ${expectedShare} | Platform: ${expectedFee}`);
      
      if (org && org.balance < expectedShare && t.event.organizer.role !== 'ADMIN') {
           console.log("  ⚠️ WARNING: Organizer balance seems low compared to this single transaction!");
      }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
