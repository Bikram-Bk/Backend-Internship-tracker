
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Debugging Payment & Balance ---');

  // 1. Get latest Attendees
  const attendees = await prisma.attendee.findMany({
    orderBy: { registeredAt: 'desc' },
    take: 3,
    include: {
      event: {
        include: {
            organizer: true
        }
      },
      user: true // The buyer
    }
  });

  console.log(`Found ${attendees.length} recent attendees:`);
  
  for (const a of attendees) {
    console.log(`\nAttendee ID: ${a.id}`);
    console.log(`  User: ${a.user?.username} (${a.userId})`);
    console.log(`  Event: ${a.event.title} (ID: ${a.event.id})`);
    console.log(`  Status: ${a.paymentStatus} (Ticket Status: ${a.status})`);
    console.log(`  Amount: ${a.paymentAmount}, PlatformFee: ${a.platformFee}`);
    console.log(`  PIDX: ${a.pidx}`);
    console.log(`  Organizer: ${a.event.organizer.username} (ID: ${a.event.organizerId})`);
    console.log(`  Organizer Balance: ${a.event.organizer.balance}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
