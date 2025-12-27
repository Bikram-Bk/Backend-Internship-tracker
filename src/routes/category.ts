import { Hono } from 'hono';
import { categoryService } from '../services/category-service.js';

const categoryRoutes = new Hono();

// GET /api/categories - Get all categories
categoryRoutes.get('/', async (c) => {
  try {
    const categories = await categoryService.getAllCategories();

    return c.json({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/categories/:id - Get category by ID
categoryRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return c.json(
        {
          success: false,
          error: 'Category not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: category,
      message: 'Category retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch category',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/categories/:id/events - Get events by category
categoryRoutes.get('/:id/events', async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const status = c.req.query('status') || 'PUBLISHED';

    const result = await categoryService.getEventsByCategory(id, {
      status,
      limit,
      offset,
    });

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
    console.error('Error fetching category events:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch category events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default categoryRoutes;
