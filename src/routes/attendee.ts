import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { attendeeService } from '../services/attendee-service.js';

const attendeeRoutes = new Hono();

// POST /api/events/:id/register - Register for event (authenticated)
attendeeRoutes.post('/:id/register', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const eventId = c.req.param('id');
    const data = await c.req.json().catch(() => ({}));

    const attendee = await attendeeService.registerForEvent(eventId, user.userId, data);

    return c.json(
      {
        success: true,
        data: attendee,
        message: attendee.status === 'WAITLIST' 
          ? 'Added to waitlist - event is at capacity' 
          : 'Successfully registered for event',
      },
      201
    );
  } catch (error) {
    console.error('Error registering for event:', error);
    const statusCode = error instanceof Error && error.message.includes('Already registered') ? 400 : 500;
    return c.json(
      {
        success: false,
        error: 'Failed to register for event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      statusCode
    );
  }
});

// DELETE /api/events/:id/register - Cancel registration (authenticated)
attendeeRoutes.delete('/:id/register', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const eventId = c.req.param('id');

    await attendeeService.cancelRegistration(eventId, user.userId);

    return c.json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to cancel registration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/events/:id/attendees - Get event attendees (organizer only)
attendeeRoutes.get('/:id/attendees', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const eventId = c.req.param('id');

    const attendees = await attendeeService.getEventAttendees(eventId, user.userId, user.role);

    return c.json({
      success: true,
      data: attendees,
      message: 'Attendees retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json(
      {
        success: false,
        error: 'Failed to fetch attendees',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      statusCode
    );
  }
});

export default attendeeRoutes;
