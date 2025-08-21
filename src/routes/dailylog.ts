import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';
import prisma from '../lib/prisma.js';

const dailyLog = new Hono();

dailyLog.put('/log', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    if (
      !body.date ||
      !body.type ||
      !body.task ||
      !body.details ||
      !body.hours
    ) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: date, type, task, details, or hours',
        },
        400
      );
    }

    const logData = {
      userId: user.userId,
      date: new Date(body.date),
      type: body.type,
      task: body.task,
      details: body.details,
      hours: body.hours,
    };
    const result = await prisma.dailyLog.create({
      data: logData,
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    return c.json(
      {
        success: true,
        data: result,
        message: 'Daily activity logged successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error logging daily activity:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to log daily activity',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.get('/logs', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const logs = await prisma.dailyLog.findMany({
      where: { userId: user.userId },
      orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    return c.json({
      success: true,
      data: logs,
      message: 'All daily logs retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.get('/weeky-log', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const logs = await prisma.dailyLog.findMany({
      where: { userId: user.userId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    return c.json({
      success: true,
      data: logs,
      message: 'Weekly logs retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving weekly logs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve weekly logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.get('/log/range', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const { startDate, endDate } = c.req.query();
    if (!startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: 'Missing required query parameters: startDate or endDate',
        },
        400
      );
    }

    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: user.userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    return c.json({
      success: true,
      data: logs,
      message: 'Logs retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
dailyLog.get('/log/analytics/type', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const analytics = await prisma.dailyLog.groupBy({
      by: ['type'],
      where: { userId: user.userId },
      _count: { type: true },
    });
    return c.json({
      success: true,
      data: analytics.map(a => ({ type: a.type, count: a._count.type })),
      message: 'Analytics by type retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving analytics:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.get('/log/:id', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const logId = c.req.param('id');
    if (!logId) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: id',
        },
        400
      );
    }
    const log = await prisma.dailyLog.findFirst({
      where: { id: logId, userId: user.userId },
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    if (!log) {
      return c.json(
        {
          success: false,
          error: 'Log not found',
        },
        404
      );
    }
    return c.json({
      success: true,
      data: log,
      message: 'Log retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving log:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.delete('/log/:id', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const logId = c.req.param('id');
    if (!logId) {
      return c.json(
        {
          success: false,
          error: 'Missing required parameter: id',
        },
        400
      );
    }
    const deletedLog = await prisma.dailyLog.deleteMany({
      where: { id: logId, userId: user.userId },
    });
    if (deletedLog.count === 0) {
      return c.json(
        {
          success: false,
          error: 'Log not found or already deleted',
        },
        404
      );
    }
    return c.json({
      success: true,
      message: 'Log deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting log:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.patch('/log/:id', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const logId = c.req.param('id');
    const body = await c.req.json();
    if (
      !logId ||
      !body.date ||
      !body.type ||
      !body.task ||
      !body.details ||
      !body.hours
    ) {
      return c.json(
        {
          success: false,
          error:
            'Missing required fields: id, date, type, task, details, or hours',
        },
        400
      );
    }
    const updatedLog = await prisma.dailyLog.update({
      where: { id: logId, userId: user.userId },
      data: {
        date: new Date(body.date),
        type: body.type,
        task: body.task,
        details: body.details,
        hours: body.hours,
      },
      select: {
        id: true,
        date: true,
        type: true,
        task: true,
        details: true,
        hours: true,
      },
    });
    return c.json({
      success: true,
      data: updatedLog,
      message: 'Log updated successfully',
    });
  } catch (error) {
    console.error('Error updating log:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

dailyLog.get('/log/types', authMiddleware, async c => {
  try {
    const user = c.get('user');
    const types = await prisma.dailyLog.groupBy({
      by: ['type'],
      where: { userId: user.userId },
      _count: { type: true },
    });
    return c.json({
      success: true,
      data: types.map(t => ({ type: t.type, count: t._count.type })),
      message: 'All unique types and counts retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving types:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve types',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default dailyLog;
