
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- RECALCULATING BALANCES ---');

  // 1. Reset all balances
  await prisma.user.updateMany({
    data: { balance: 0 }
  });
  console.log('Step 1: Balances reset to 0.');

  // 2. Fetch completed transactions
  const transactions = await prisma.attendee.findMany({
    where: { paymentStatus: 'COMPLETED' },
    include: { event: { include: { organizer: true } } }
  });

  console.log(`Step 2: Processing ${transactions.length} completed transactions...`);

  const commissionRate = 0.10;

  for (const t of transactions) {
      const amount = Number(t.paymentAmount);
      let platformFee = 0;
      let organizerShare = amount;

      if (t.event.organizer.role !== 'ADMIN') {
          platformFee = amount * commissionRate;
          organizerShare = amount - platformFee;
      }

      console.log(` > Tx ${t.id}: Amount ${amount}, OrgShare ${organizerShare}, Fee ${platformFee}`);

      // Credit Organizer
      if (t.event.organizerId) {
          await prisma.user.update({
              where: { id: t.event.organizerId },
              data: { balance: { increment: organizerShare } }
          });
      }

      // Credit Admin (Lenish)
      if (platformFee > 0) {
          const admin = await prisma.user.findUnique({ where: { email: 'lenishmagar@gmail.com' } });
          if (admin) {
              await prisma.user.update({
                  where: { id: admin.id },
                  data: { balance: { increment: platformFee } }
              });
          }
      }
      
      // Update recorded fee in attendee just in case
      await prisma.attendee.update({
          where: { id: t.id },
          data: { platformFee }
      });
  }
  
  console.log('Step 3: Done. New Balances:');
  const users = await prisma.user.findMany({
      where: { balance: { gt: 0 } },
      select: { username: true, balance: true, email: true }
  });
  console.table(users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
