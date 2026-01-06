
import prisma from '../src/lib/prisma';
import { khaltiService } from '../src/services/khalti-service';
import { paymentProcessing } from '../src/services/payment-processing';

async function main() {
  console.log('--- Fixing Stuck Payments ---');

  // Find pending payments with PIDX
  const stuckAttendees = await prisma.attendee.findMany({
    where: {
        paymentStatus: 'PENDING',
        pidx: { not: null }
    }
  });

  console.log(`Found ${stuckAttendees.length} stuck payments.`);

  for (const a of stuckAttendees) {
      if (!a.pidx) continue;
      console.log(`Checking ${a.id} (PIDX: ${a.pidx})...`);
      
      try {
        const verification = await khaltiService.verifyPayment(a.pidx);
        console.log(`  Khalti Status: ${verification.status}`);
        
        if (verification.status === 'Completed') {
            console.log('  Completing transaction...');
            await paymentProcessing.handlePaymentSuccess(a.id, verification);
            console.log('  Done!');
        }
      } catch (e) {
          console.error(`  Failed to verify:`, e);
      }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
