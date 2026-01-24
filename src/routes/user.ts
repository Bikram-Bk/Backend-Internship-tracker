import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { userService } from '../services/userservices.js';
import { attendeeService } from '../services/attendee-service.js';

const userRoutes = new Hono();

import { khaltiService } from '../services/khalti-service.js';
import { paymentProcessing } from '../services/payment-processing.js';

userRoutes.get('/events', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const events = await attendeeService.getUserRegisteredEvents(userId);

    // Self-healing: Check for pending payments that might have completed
    for (const event of events) {
        if (event.paymentStatus === 'PENDING' && event.pidx) {
            try {
                const verification = await khaltiService.verifyPayment(event.pidx);
                if (verification.status === 'Completed') {
                    await paymentProcessing.handlePaymentSuccess(event.id, verification);
                    // Update local object so UI reflects change immediately
                    event.paymentStatus = 'COMPLETED';
                    event.status = 'REGISTERED';
                }
            } catch (e) {
                console.error(`Auto-verification failed for ${event.id}`, e);
            }
        }
    }

    return c.json({
      success: true,
      data: events,
      message: 'User events retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch user events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

userRoutes.get('/profile', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const user = await userService.get(userId);

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'User not found',
        },
        404
      );
    }
    return c.json(
      {
        success: true,
        data: user,
      },
      200
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

userRoutes.patch('/update-profile', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json();
 
    // Only allow updating specific fields
    const updateData: { username?: string; phone?: string; email?: string; avatar?: string } = {};
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
 
    if (Object.keys(updateData).length === 0) {
      return c.json(
        {
          success: false,
          error: 'No valid fields provided for update',
        },
        400
      );
    }
 
    // Validation
    if (updateData.username !== undefined) {
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!updateData.username.trim()) {
        return c.json({ success: false, error: 'Username is required' }, 400);
      } else if (!nameRegex.test(updateData.username)) {
        return c.json({ success: false, error: 'Name should only contain letters' }, 400);
      }
    }

    if (updateData.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!updateData.email.trim()) {
        return c.json({ success: false, error: 'Email is required' }, 400);
      } else if (!emailRegex.test(updateData.email)) {
        return c.json({ success: false, error: 'Please enter a valid email address' }, 400);
      }

      // Check for uniqueness
      const existingUser = await userService.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return c.json({ success: false, error: 'Email already exists' }, 409);
      }
    }

    if (updateData.phone !== undefined && updateData.phone.trim() !== "") {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(updateData.phone)) {
        return c.json({ success: false, error: 'Phone number must be exactly 10 digits' }, 400);
      }
    }

    const user = await userService.updateProfile(userId, updateData);
 
    return c.json(
      {
        success: true,
        data: user,
        message: 'Profile updated successfully',
      },
      200
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

userRoutes.get('/stats', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const stats = await userService.getStats(userId);
    
    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

export default userRoutes;
