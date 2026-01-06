import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import prisma from '../lib/prisma.js';

const settingsRoutes = new Hono<{ Variables: { user: any } }>();

// GET /api/settings/commission
settingsRoutes.get('/commission', authMiddleware, async (c) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'COMMISSION_RATE' }
    });
    
    return c.json({
      success: true,
      data: {
        rate: setting ? Number(setting.value) : 10 // Default 10 if not set
      }
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch settings' }, 500);
  }
});

// PUT /api/settings/commission - Admin Only
settingsRoutes.put('/commission', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Check if user is admin
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }});
    if (dbUser?.role !== 'ADMIN') {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const { rate } = await c.req.json();
    if (rate === undefined || rate < 0 || rate > 100) {
        return c.json({ success: false, error: 'Invalid rate (0-100)' }, 400);
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'COMMISSION_RATE' },
      update: { value: String(rate) },
      create: { 
        key: 'COMMISSION_RATE', 
        value: String(rate),
        description: 'Platform commission rate in percentage'
      } 
    });

    return c.json({
      success: true,
      data: { rate: Number(setting.value) },
      message: 'Commission rate updated'
    });

  } catch (error) {
    return c.json({ success: false, error: 'Failed to update settings' }, 500);
  }
});

export default settingsRoutes;
