import prisma from '../lib/prisma.js';

export const categoryService = {
  // Get all active categories
  async getAllCategories() {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  },

  // Get category by ID
  async getCategoryById(id: string) {
    return await prisma.category.findUnique({
      where: { id },
    });
  },

  // Get category by slug
  async getCategoryBySlug(slug: string) {
    return await prisma.category.findUnique({
      where: { slug },
    });
  },

  // Get events by category
  async getEventsByCategory(
    categoryId: string,
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { status = 'PUBLISHED', limit = 20, offset = 0 } = filters;

    const events = await prisma.event.findMany({
      where: {
        categoryId,
        status: status as any,
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
            attendees: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.event.count({
      where: {
        categoryId,
        status: status as any,
      },
    });

    return {
      events,
      total,
      limit,
      offset,
    };
  },
};
