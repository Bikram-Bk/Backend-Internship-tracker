import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { khaltiService } from '../services/khalti-service.js';
import prisma from '../lib/prisma.js';
import { paymentProcessing } from '../services/payment-processing.js';

const paymentRoutes = new Hono<{ Variables: { user: any } }>();

// POST /api/payments/initiate - Initiate payment for an event
paymentRoutes.post('/initiate', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { eventId, ticketType = 'General', quantity = 1 } = await c.req.json();

    // Verify user exists (Handling re-seeded DB case)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId }
    });

    if (!dbUser) {
        return c.json({ success: false, error: 'User not found. Please log in again.' }, 401);
    }

    if (!eventId) {
      return c.json({ success: false, error: 'Event ID is required' }, 400);
    }
    
    if (quantity < 1) {
        return c.json({ success: false, error: 'Quantity must be at least 1' }, 400);
    }

    // 1. Fetch Event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    if (event.isFree) {
        return c.json({ success: false, error: 'Event is free, no payment needed' }, 400);
    }

    const unitPrice = Number(event.price);
    if (!unitPrice || unitPrice <= 0) {
        return c.json({ success: false, error: 'Invalid event price' }, 400);
    }
    
    const totalPrice = unitPrice * quantity;

    // 2. Create or Update Attendee Record (Pending Payment)
    // We use upsert to handle retries
    const attendee = await prisma.attendee.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: user.userId,
        },
      },
      update: {
        paymentStatus: 'PENDING',
        ticketType,
        ticketCount: quantity,
        paymentAmount: totalPrice,
      },
      create: {
        eventId,
        userId: user.userId,
        paymentStatus: 'PENDING',
        status: 'PENDING', 
        ticketType,
        ticketCount: quantity,
        paymentAmount: totalPrice,
      },
      include: {
        user: true,
      }
    });

    // 3. Initiate Khalti Payment
    const amountInPaisa = totalPrice * 100;
    const purchaseOrderId = attendee.id; // Use Attendee ID as unique order ID
    const purchaseOrderName = `${quantity}x Ticket for ${event.title}`;

    const khaltiResponse = await khaltiService.initiatePayment({
      amount: amountInPaisa,
      purchaseOrderId,
      purchaseOrderName,
      customerInfo: {
        name: user.username || 'User',
        email: user.email,
        phone: user.phone 
      },
    });

    // Save pidx for later verification
    await prisma.attendee.update({
        where: { id: attendee.id },
        data: { pidx: khaltiResponse.pidx }
    });

    return c.json({
      success: true,
      data: {
        payment_url: khaltiResponse.payment_url,
        pidx: khaltiResponse.pidx,
        attendeeId: attendee.id,
      },
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    return c.json({ success: false, error: 'Payment initiation failed' }, 500);
  }
});

// GET /api/payments/status/:id - Check payment status
paymentRoutes.get('/status/:id', async (c) => {
    const id = c.req.param('id');
    const attendee = await prisma.attendee.findUnique({
        where: { id },
        select: { paymentStatus: true, pidx: true }
    });

    if (!attendee) return c.json({ success: false, error: 'Not found' }, 404);
    
    // If pending and we have pidx, double check with Khalti
    if (attendee.paymentStatus === 'PENDING' && attendee.pidx) {
        try {
            const verification = await khaltiService.verifyPayment(attendee.pidx);
            if (verification.status === 'Completed') {
                await paymentProcessing.handlePaymentSuccess(id, verification);
                return c.json({ success: true, data: { status: 'COMPLETED' } });
            }
        } catch (e) {
            console.error("Verification check failed during status poll", e);
        }
    }

    return c.json({
        success: true,
        data: { status: attendee.paymentStatus }
    });
});

// GET /api/payments/callback - Handle Khalti callback
paymentRoutes.get('/callback', async (c) => {
  const pidx = c.req.query('pidx');
  const purchaseOrderId = c.req.query('purchase_order_id');
  const status = c.req.query('status');

  // HTML Templates
  const appScheme = 'eventmanagement://'; 
  const getHtml = (title: string, message: string, success: boolean) => `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 90%; width: 400px; }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { color: #111827; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
          p { color: #6b7280; margin: 0 0 1.5rem 0; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          ${success ? '' : '<div class="icon">❌</div>'}
          ${success ? '<div class="loader"></div>' : ''}
          <h1>${title}</h1>
          <p>${message}</p>
          
          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
              <a href="${appScheme}payment/success" style="padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px;">Return to App</a>
              <a href="exp+event_management://payment/success" style="padding: 10px 20px; background: #000; color: white; text-decoration: none; border-radius: 8px; font-size: 0.8rem;">Open in Expo Go</a>
          </div>
        </div>
        <script>
          const redirectUrl = '${success ? appScheme + 'payment/success' : appScheme + 'payment/failure'}';
          
          setTimeout(() => {
             window.location.href = redirectUrl;
          }, 1000);
        </script>
      </body>
    </html>
  `;

  try {
    if (!pidx || !purchaseOrderId) {
      return c.html(getHtml('Error', 'Missing payment ID', false));
    }

    // Verify with Khalti
    const verification = await khaltiService.verifyPayment(pidx);

    if (verification.status === 'Completed') {
      // Security: Validate details
      const attendee = await prisma.attendee.findUnique({
          where: { id: purchaseOrderId }
      });

      if (!attendee) {
           return c.html(getHtml('Error', 'Transaction not found', false));
      }

      // 1. Verify ID match (Khalti response vs Local)
      if (verification.purchase_order_id && verification.purchase_order_id !== purchaseOrderId) {
           console.error(`Khalti Mismatch: Response ID ${verification.purchase_order_id} !== Request ID ${purchaseOrderId}`);
           return c.html(getHtml('Error', 'Security Check Failed', false));
      }

      // 2. Verify Amount (Allow 1 paisa diff)
      // verification.total_amount is in Paisa. attendee.paymentAmount is in Rupees.
      const expectedPaisa = Math.round(Number(attendee.paymentAmount) * 100);
      if (Math.abs(verification.total_amount - expectedPaisa) > 1) {
           console.error(`Khalti Amount Mismatch: Paid ${verification.total_amount}, Expected ${expectedPaisa}`);
           return c.html(getHtml('Error', 'Payment Amount Mismatch', false));
      }

      await paymentProcessing.handlePaymentSuccess(purchaseOrderId, verification);
      return c.html(getHtml('Payment Successful', 'Redirecting you back to the app...', true).replace('const redirectUrl = success ?', `const redirectUrl = true ?`)); 
    } else {
        return c.html(getHtml('Payment Failed', `Status: ${verification.status}`, false));
    }

  } catch (error) {
    console.error('Callback processing error:', error);
    return c.html(getHtml('System Error', 'Failed to process payment', false));
  }
});

export default paymentRoutes;
