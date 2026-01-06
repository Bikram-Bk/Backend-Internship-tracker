import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { requireAdmin } from '../middleware/authorization.js';
import { eventService } from '../services/event-service.js';

const eventRoutes = new Hono();

// GET /api/events - Get all events (public)
eventRoutes.get('/', async (c) => {
  try {
    const filters = {
      categoryId: c.req.query('categoryId'),
      status: c.req.query('status') || 'PUBLISHED',
      city: c.req.query('city'),
      isFree: c.req.query('isFree') === 'true' ? true : (c.req.query('isFree') === 'false' ? false : undefined),
      isVirtual: c.req.query('isVirtual') === 'true' ? true : (c.req.query('isVirtual') === 'false' ? false : undefined),
      startDateFrom: c.req.query('startDateFrom'),
      startDateTo: c.req.query('startDateTo'),
      limit: parseInt(c.req.query('limit') || '20'),
      offset: parseInt(c.req.query('offset') || '0'),
      sortBy: c.req.query('sortBy') || 'startDate',
      search: c.req.query('search'),
    };

    const result = await eventService.getAllEvents(filters);

    return c.json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
      message: 'Events retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/events/:id - Get event by ID (public)
eventRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const event = await eventService.getEventById(id);

    if (!event) {
      return c.json(
        {
          success: false,
          error: 'Event not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: event,
      message: 'Event retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// POST /api/events/request - Request event (authenticated users)
eventRoutes.post('/request', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const data = await c.req.json();

    // Validate required fields (excluding coverImage for requests)
    if (!data.title || !data.description || !data.categoryId || !data.startDate || !data.endDate) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Title, description, category, and dates are required',
        },
        400
      );
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
      return c.json(
        {
          success: false,
          error: 'Invalid dates',
          message: 'End date must be after start date',
        },
        400
      );
    }

    // Set status to DRAFT for requests
    const eventData = {
      ...data,
      status: 'DRAFT',
    };

    const event = await eventService.createEvent(eventData, user.userId);

    return c.json(
      {
        success: true,
        data: event,
        message: 'Event request submitted successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error requesting event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to submit event request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// POST /api/events - Create event (admin only)
eventRoutes.post('/', authMiddleware, requireAdmin(), async (c) => {
  try {
    const user = c.get('user');
    const data = await c.req.json();

    // Validate required fields
    const isDraft = data.status === 'DRAFT';
    if (!data.title || !data.description || !data.categoryId || !data.startDate || !data.endDate || (!isDraft && !data.coverImage)) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
          message: `Title, description, category, and dates are required. ${!isDraft ? 'Cover image is also required for published events.' : ''}`,
        },
        400
      );
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
      return c.json(
        {
          success: false,
          error: 'Invalid dates',
          message: 'End date must be after start date',
        },
        400
      );
    }

    const event = await eventService.createEvent(data, user.userId);

    return c.json(
      {
        success: true,
        data: event,
        message: 'Event created successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// PUT /api/events/:id - Update event (authenticated, owner only)
eventRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const data = await c.req.json();

    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR';
    const event = await eventService.updateEvent(id, data, user.userId, isAdmin);

    return c.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('Error updating event:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json(
      {
        success: false,
        error: 'Failed to update event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      statusCode
    );
  }
});

// DELETE /api/events/:id - Delete event (authenticated, owner only)
eventRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    await eventService.deleteEvent(id, user.userId);

    return c.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json(
      {
        success: false,
        error: 'Failed to delete event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      statusCode
    );
  }
});

// POST /api/events/:id/publish - Publish event (authenticated, owner only)
eventRoutes.post('/:id/publish', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const event = await eventService.publishEvent(id, user.userId);

    return c.json({
      success: true,
      data: event,
      message: 'Event published successfully',
    });
  } catch (error) {
    console.error('Error publishing event:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json(
      {
        success: false,
        error: 'Failed to publish event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      statusCode
    );
  }
});

export default eventRoutes;
