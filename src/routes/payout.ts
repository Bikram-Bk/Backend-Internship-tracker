
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { requireAdmin } from '../middleware/authorization.js';
import prisma from '../lib/prisma.js';

const payoutRoutes = new Hono<{ Variables: { user: any } }>();

// GET /api/payouts/all - Admin: Get All Payout Requests
payoutRoutes.get('/all', authMiddleware, requireAdmin(), async (c) => {
  const payouts = await prisma.payout.findMany({
    include: {
        user: {
            select: {
                id: true,
                username: true,
                email: true
            }
        }
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ success: true, data: payouts });
});

// PUT /api/payouts/:id/status - Admin: Update Payout Status (Approve/Reject)
payoutRoutes.put('/:id/status', authMiddleware, requireAdmin(), async (c) => {
    const payoutId = c.req.param('id');
    const { status } = await c.req.json();

    if (!['PAID', 'REJECTED'].includes(status)) {
        return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) return c.json({ success: false, error: 'Payout not found' }, 404);

    if (payout.status !== 'PENDING') {
        return c.json({ success: false, error: 'Payout is already processed' }, 400);
    }

    if (status === 'REJECTED') {
        // Refund balance to user
        await prisma.$transaction([
            prisma.payout.update({
                where: { id: payoutId },
                data: { status: 'REJECTED', processedAt: new Date() }
            }),
            prisma.user.update({
                where: { id: payout.userId },
                data: { balance: { increment: payout.amount } }
            })
        ]);
        return c.json({ success: true, message: 'Payout rejected and refunded.' });
    } else {
        // Mark as PAID
        await prisma.payout.update({
            where: { id: payoutId },
            data: { status: 'PAID', processedAt: new Date() }
        });
        return c.json({ success: true, message: 'Payout marked as PAID.' });
    }
});

// GET /api/payouts - Get My Payouts
payoutRoutes.get('/', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const payouts = await prisma.payout.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ success: true, data: payouts });
});

// POST /api/payouts/request - Request a Payout
payoutRoutes.post('/request', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const { amount, khaltiNumber } = await c.req.json();

  if (!amount || amount <= 0) {
    return c.json({ success: false, error: 'Invalid amount' }, 400);
  }

  if (!khaltiNumber) {
    return c.json({ success: false, error: 'Khalti Number is required' }, 400);
  }

  // Check Balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);

  const balance = Number(user.balance);
  if (balance < amount) {
    return c.json({ success: false, error: 'Insufficient balance' }, 400);
  }

  // Create Payout Request
  // Note: We DO NOT deduct balance yet. Balance is deducted when Admin approves/pays.
  // Or we can deduct now and refund if rejected. Deducting now is safer to prevent double spend.
  // Let's deduct NOW (Escrow style).
  
  await prisma.$transaction([
    prisma.payout.create({
      data: {
        userId,
        amount,
        destinationNumber: khaltiNumber,
        status: 'PENDING',
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    }),
  ]);

  return c.json({ success: true, message: 'Payout requested successfully. Balance deducted.' });
});

export default payoutRoutes;
