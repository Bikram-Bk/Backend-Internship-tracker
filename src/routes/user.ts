import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { userService } from '../services/userservices.js';
import { attendeeService } from '../services/attendee-service.js';

const userRoutes = new Hono();

userRoutes.get('/events', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const events = await attendeeService.getUserRegisteredEvents(userId);

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

userRoutes.put('/profile', authMiddleware, async c => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json();

    // Only allow updating specific fields
    const updateData: { username?: string; phone?: string } = {};
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;

    if (Object.keys(updateData).length === 0) {
      return c.json(
        {
          success: false,
          error: 'No valid fields provided for update',
        },
        400
      );
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

export default userRoutes;
