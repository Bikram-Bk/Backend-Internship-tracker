import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import { requireAdmin, requireModerator } from '../middleware/authorization.js';
import { adminService } from '../services/admin-service.js';
import { analyticsService } from '../services/analytics-service.js';

const adminRoutes = new Hono();

// All admin routes require authentication
adminRoutes.use('*', authMiddleware);

// ==================== USER MANAGEMENT ====================

// GET /api/admin/users - List all users (admin only)
adminRoutes.get('/users', requireAdmin(), async (c) => {
  try {
    const role = c.req.query('role');
    const search = c.req.query('search');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await adminService.getAllUsers({ role, search, limit, offset });

    return c.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/users/:id - Get user details (admin only)
adminRoutes.get('/users/:id', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    const user = await adminService.getUserById(id);

    return c.json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch user',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      404
    );
  }
});

// PUT /api/admin/users/:id/role - Update user role (admin only)
adminRoutes.put('/users/:id/role', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    const { role } = await c.req.json();

    if (!role) {
      return c.json(
        {
          success: false,
          error: 'Role is required',
        },
        400
      );
    }

    const user = await adminService.updateUserRole(id, role);

    return c.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update user role',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// DELETE /api/admin/users/:id - Delete user (admin only)
adminRoutes.delete('/users/:id', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    await adminService.deleteUser(id);

    return c.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/users/:id/stats - Get user statistics (admin/moderator)
adminRoutes.get('/users/:id/stats', requireModerator(), async (c) => {
  try {
    const id = c.req.param('id');
    const stats = await adminService.getUserStats(id);

    return c.json({
      success: true,
      data: stats,
      message: 'User stats retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch user stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ==================== EVENT MODERATION ====================

// GET /api/admin/events/pending - Get pending events (moderator+)
adminRoutes.get('/events/pending', requireModerator(), async (c) => {
  try {
    const events = await adminService.getPendingEvents();

    return c.json({
      success: true,
      data: events,
      message: 'Pending events retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching pending events:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch pending events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// POST /api/admin/events/:id/approve - Approve event (moderator+)
adminRoutes.post('/events/:id/approve', requireModerator(), async (c) => {
  try {
    const id = c.req.param('id');
    const event = await adminService.approveEvent(id);

    return c.json({
      success: true,
      data: event,
      message: 'Event approved successfully',
    });
  } catch (error) {
    console.error('Error approving event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to approve event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// POST /api/admin/events/:id/reject - Reject event (moderator+)
adminRoutes.post('/events/:id/reject', requireModerator(), async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json().catch(() => ({}));

    const event = await adminService.rejectEvent(id, reason);

    return c.json({
      success: true,
      data: event,
      message: 'Event rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to reject event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// DELETE /api/admin/events/:id - Delete any event (admin only)
adminRoutes.delete('/events/:id', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    await adminService.deleteAnyEvent(id);

    return c.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ==================== ANALYTICS ====================

// GET /api/admin/analytics/overview - Dashboard overview (moderator+)
adminRoutes.get('/analytics/overview', requireModerator(), async (c) => {
  try {
    const stats = await analyticsService.getOverviewStats();

    return c.json({
      success: true,
      data: stats,
      message: 'Overview stats retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch overview stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/analytics/events - Event statistics (moderator+)
adminRoutes.get('/analytics/events', requireModerator(), async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');

    const timeRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    const stats = await analyticsService.getEventStats(timeRange);

    return c.json({
      success: true,
      data: stats,
      message: 'Event stats retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch event stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/analytics/users - User statistics (moderator+)
adminRoutes.get('/analytics/users', requireModerator(), async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');

    const timeRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    const growth = await analyticsService.getUserGrowth(timeRange);

    return c.json({
      success: true,
      data: growth,
      message: 'User growth stats retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch user stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/analytics/revenue - Revenue statistics (admin only)
adminRoutes.get('/analytics/revenue', requireAdmin(), async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');

    const timeRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    const stats = await analyticsService.getRevenueStats(timeRange);

    return c.json({
      success: true,
      data: stats,
      message: 'Revenue stats retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch revenue stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/analytics/popular - Popular events (moderator+)
adminRoutes.get('/analytics/popular', requireModerator(), async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const events = await analyticsService.getPopularEvents(limit);

    return c.json({
      success: true,
      data: events,
      message: 'Popular events retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching popular events:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch popular events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/admin/analytics/categories - Category distribution (moderator+)
adminRoutes.get('/analytics/categories', requireModerator(), async (c) => {
  try {
    const distribution = await analyticsService.getCategoryDistribution();

    return c.json({
      success: true,
      data: distribution,
      message: 'Category distribution retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch category distribution',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ==================== CATEGORY MANAGEMENT ====================

// POST /api/admin/categories - Create category (admin only)
adminRoutes.post('/categories', requireAdmin(), async (c) => {
  try {
    const data = await c.req.json();
    const category = await adminService.createCategory(data);

    return c.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// PUT /api/admin/categories/:id - Update category (admin only)
adminRoutes.put('/categories/:id', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const category = await adminService.updateCategory(id, data);

    return c.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// DELETE /api/admin/categories/:id - Delete category (admin only)
adminRoutes.delete('/categories/:id', requireAdmin(), async (c) => {
  try {
    const id = c.req.param('id');
    await adminService.deleteCategory(id);

    return c.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete category',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// PUT /api/admin/categories/reorder - Reorder categories (admin only)
adminRoutes.put('/categories/reorder', requireAdmin(), async (c) => {
  try {
    const { categoryOrders } = await c.req.json();

    if (!Array.isArray(categoryOrders)) {
      return c.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'categoryOrders must be an array',
        },
        400
      );
    }

    await adminService.reorderCategories(categoryOrders);

    return c.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to reorder categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default adminRoutes;
