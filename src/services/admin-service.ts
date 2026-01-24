import prisma from '../lib/prisma.js';

export const adminService = {
  // ==================== USER MANAGEMENT ====================

  // Get all users with filters and pagination
  async getAllUsers(filters: {
    role?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { role, search, limit = 50, offset = 0 } = filters;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            organizedEvents: true,
            attendingEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.user.count({ where });

    return { users, total, limit, offset };
  },

  // Get user by ID with detailed stats
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            organizedEvents: true,
            attendingEvents: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  // Update user role
  async updateUserRole(userId: string, role: string) {
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      throw new Error('Invalid role');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
  },

  // Delete user
  async deleteUser(userId: string) {
    // Check if user has events
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            organizedEvents: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user._count.organizedEvents > 0) {
      throw new Error('Cannot delete user with existing events. Delete or reassign events first.');
    }

    return await prisma.user.delete({
      where: { id: userId },
    });
  },

  // Get user statistics
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const eventsCreated = await prisma.event.count({
      where: { organizerId: userId },
    });

    const eventsAttending = await prisma.attendee.count({
      where: {
        userId,
        status: { in: ['REGISTERED', 'ATTENDED'] },
      },
    });

    const totalAttendees = await prisma.attendee.count({
      where: {
        event: { organizerId: userId },
        status: { in: ['REGISTERED', 'ATTENDED'] },
      },
    });

    return {
      user,
      stats: {
        eventsCreated,
        eventsAttending,
        totalAttendees,
      },
    };
  },
 
  // ==================== EVENT MODERATION ====================
 
  // Get all events regardless of status
  async getAllEvents() {
    return await prisma.event.findMany({
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
 
  // Get pending events (drafts or awaiting approval)
  async getPendingEvents() {
    return await prisma.event.findMany({
      where: {
        status: 'DRAFT',
      },
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Approve event (publish it)
  async approveEvent(eventId: string) {
    return await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  },

  // Reject event (cancel it)
  async rejectEvent(eventId: string, reason?: string) {
    // In a real app, you'd send notification to organizer with reason
    return await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'CANCELLED',
      },
    });
  },

  // Delete any event (admin only)
  async deleteAnyEvent(eventId: string) {
    return await prisma.event.delete({
      where: { id: eventId },
    });
  },

  // ==================== CATEGORY MANAGEMENT ====================

  // Create new category
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    icon: string;
    color: string;
    order?: number;
  }) {
    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error('Category with this slug already exists');
    }

    // Get max order
    const maxOrder = await prisma.category.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return await prisma.category.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder?.order ?? 0) + 1,
      },
    });
  },

  // Update category
  async updateCategory(id: string, data: Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    order: number;
    isActive: boolean;
  }>) {
    return await prisma.category.update({
      where: { id },
      data,
    });
  },

  // Delete category
  async deleteCategory(id: string) {
    // Check if category has events
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    if (category._count.events > 0) {
      throw new Error('Cannot delete category with existing events. Reassign events first.');
    }

    return await prisma.category.delete({
      where: { id },
    });
  },

  // Reorder categories
  async reorderCategories(categoryOrders: { id: string; order: number }[]) {
    const updates = categoryOrders.map(({ id, order }) =>
      prisma.category.update({
        where: { id },
        data: { order },
      })
    );

    return await prisma.$transaction(updates);
  },
};
