import prisma from '../lib/prisma.js';

export const paymentProcessing = {
  handlePaymentSuccess: async (attendeeId: string, verification: any) => {
    // 0. Idempotency Check
    const existing = await prisma.attendee.findUnique({
        where: { id: attendeeId },
        select: { paymentStatus: true }
    });

    if (existing && existing.paymentStatus === 'COMPLETED') {
        console.log(`Payment ${attendeeId} already processed. Skipping.`);
        return;
    }

    const amount = verification.total_amount / 100;

    await prisma.$transaction(async (tx) => {
        // 1. Fetch default commission from settings
        let commissionRate = 0.10; // Default 10%
        const setting = await tx.systemSetting.findUnique({
            where: { key: 'COMMISSION_RATE' }
        });
        if (setting) {
            commissionRate = Number(setting.value) / 100;
        }

        // 2. Update Attendee & Get Organizer Info
        const attendee = await tx.attendee.update({
            where: { id: attendeeId },
            data: {
                paymentStatus: 'COMPLETED',
                status: 'REGISTERED',
                transactionId: verification.transaction_id,
                paymentAmount: amount,
            },
            include: {
                event: {
                    include: {
                        organizer: true
                    }
                }, 
            }
        });

        // 3. Determine Final Commission
        if (attendee.event.organizer.role === 'ADMIN') {
            commissionRate = 0;
        }

        const platformFee = amount * commissionRate;
        const organizerShare = amount - platformFee;

        // Update platformFee in DB
        await tx.attendee.update({
            where: { id: attendee.id },
            data: { platformFee }
        });

        // 4. Credit Organizer (Amount - Commission)
        if (attendee.event.organizerId) {
            await tx.user.update({
                where: { id: attendee.event.organizerId },
                data: {
                    balance: {
                        increment: organizerShare,
                    },
                },
            });
        }

        // 5. Credit Admin (Commission) - Only if fee > 0
        if (platformFee > 0) {
            const adminUser = await tx.user.findUnique({
                where: { email: 'lenishmagar@gmail.com' }
            });

            if (adminUser) {
                await tx.user.update({
                    where: { id: adminUser.id },
                    data: {
                        balance: {
                            increment: platformFee
                        }
                    }
                });
            }
        }
    }); // End transaction
  }
};
