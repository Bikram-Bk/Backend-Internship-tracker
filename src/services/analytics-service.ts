import prisma from '../lib/prisma.js';

export const analyticsService = {
  // ==================== DASHBOARD OVERVIEW ====================

  // Get overview statistics for dashboard
  async getOverviewStats() {
    const totalEvents = await prisma.event.count();
    const publishedEvents = await prisma.event.count({
      where: { status: 'PUBLISHED' },
    });
    const totalUsers = await prisma.user.count();
    const totalRegistrations = await prisma.attendee.count({
      where: { status: { in: ['REGISTERED', 'ATTENDED'] } },
    });

    // Get stats for this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const eventsThisMonth = await prisma.event.count({
      where: {
        createdAt: { gte: thisMonthStart },
      },
    });

    const usersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: thisMonthStart },
      },
    });

    const registrationsThisMonth = await prisma.attendee.count({
      where: {
        registeredAt: { gte: thisMonthStart },
        status: { in: ['REGISTERED', 'ATTENDED'] },
      },
    });

    return {
      total: {
        events: totalEvents,
        publishedEvents,
        users: totalUsers,
        registrations: totalRegistrations,
      },
      thisMonth: {
        events: eventsThisMonth,
        users: usersThisMonth,
        registrations: registrationsThisMonth,
      },
    };
  },

  // ==================== EVENT STATISTICS ====================

  // Get event statistics
  async getEventStats(timeRange?: { from?: Date; to?: Date }) {
    const where: any = {};
    if (timeRange?.from || timeRange?.to) {
      where.createdAt = {};
      if (timeRange.from) where.createdAt.gte = timeRange.from;
      if (timeRange.to) where.createdAt.lte = timeRange.to;
    }

    // Events by status
    const byStatus = await prisma.event.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Events by category
    const byCategory = await prisma.event.groupBy({
      by: ['categoryId'],
      where,
      _count: true,
    });

    // Get category names
    const categoryIds = byCategory.map((c) => c.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const byCategoryWithNames = byCategory.map((item) => ({
      category: categories.find((c) => c.id === item.categoryId),
      count: item._count,
    }));

    return {
      byStatus,
      byCategory: byCategoryWithNames,
    };
  },

  // ==================== USER GROWTH ====================

  // Get user growth over time
  async getUserGrowth(timeRange?: { from?: Date; to?: Date }) {
    const where: any = {};
    if (timeRange?.from || timeRange?.to) {
      where.createdAt = {};
      if (timeRange.from) where.createdAt.gte = timeRange.from;
      if (timeRange.to) where.createdAt.lte = timeRange.to;
    }

    // Get users grouped by date
    const users = await prisma.user.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = users.reduce((acc: any, user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  },

  // ==================== POPULAR EVENTS ====================

  // Get most popular events by attendance
  async getPopularEvents(limit = 10) {
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
      },
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            attendees: {
              where: {
                status: { in: ['REGISTERED', 'ATTENDED'] },
              },
            },
          },
        },
      },
      orderBy: {
        attendees: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return events.map((event) => ({
      ...event,
      attendeeCount: event._count.attendees,
    }));
  },

  // ==================== CATEGORY DISTRIBUTION ====================

  // Get event distribution by category
  async getCategoryDistribution() {
    const distribution = await prisma.event.groupBy({
      by: ['categoryId'],
      where: {
        status: 'PUBLISHED',
      },
      _count: true,
    });

    const categoryIds = distribution.map((d) => d.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    return distribution.map((item) => ({
      category: categories.find((c) => c.id === item.categoryId),
      count: item._count,
    }));
  },

  // ==================== REVENUE STATISTICS ====================

  // Get revenue statistics (for paid events)
  async getRevenueStats(timeRange?: { from?: Date; to?: Date }) {
    const where: any = {
      paymentStatus: 'COMPLETED',
    };

    if (timeRange?.from || timeRange?.to) {
      where.registeredAt = {};
      if (timeRange.from) where.registeredAt.gte = timeRange.from;
      if (timeRange.to) where.registeredAt.lte = timeRange.to;
    }

    const attendees = await prisma.attendee.findMany({
      where,
      select: {
        paymentAmount: true,
        registeredAt: true,
      },
    });

    const totalRevenue = attendees.reduce((sum, a) => {
      return sum + (a.paymentAmount ? Number(a.paymentAmount) : 0);
    }, 0);

    // Group by date
    const byDate = attendees.reduce((acc: any, attendee) => {
      const date = attendee.registeredAt.toISOString().split('T')[0];
      const amount = attendee.paymentAmount ? Number(attendee.paymentAmount) : 0;
      acc[date] = (acc[date] || 0) + amount;
      return acc;
    }, {});

    const revenueByDate = Object.entries(byDate).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    return {
      totalRevenue,
      revenueByDate,
    };
  },

  // ==================== EVENT ANALYTICS ====================

  // Get detailed analytics for a specific event
  async getEventAnalytics(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            attendees: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Get registration trends
    const registrations = await prisma.attendee.findMany({
      where: {
        eventId,
        status: { in: ['REGISTERED', 'ATTENDED'] },
      },
      select: {
        registeredAt: true,
      },
      orderBy: { registeredAt: 'asc' },
    });

    const registrationTrends = registrations.reduce((acc: any, reg) => {
      const date = reg.registeredAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return {
      event,
      analytics: {
        views: event.viewCount,
        registrations: event._count.attendees,
        favorites: event._count.favorites,
        reviews: event._count.reviews,
        registrationTrends: Object.entries(registrationTrends).map(([date, count]) => ({
          date,
          count,
        })),
      },
    };
  },
};
