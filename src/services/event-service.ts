import prisma from '../lib/prisma.js';

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Add unique suffix if slug already exists
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export const eventService = {
  // Create new event
  async createEvent(data: any, userId: string) {
    const baseSlug = generateSlug(data.title);
    const slug = await ensureUniqueSlug(baseSlug);

    const event = await prisma.event.create({
      data: {
        ...data,
        slug,
        organizerId: userId,
        status: data.status || 'DRAFT',
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
      },
    });

    return event;
  },

  // Get all events with filters and pagination
  async getAllEvents(filters: {
    categoryId?: string;
    status?: string;
    city?: string;
    isFree?: boolean;
    isVirtual?: boolean;
    startDateFrom?: string;
    startDateTo?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    search?: string;
  } = {}) {
    const {
      categoryId,
      status = 'PUBLISHED',
      city,
      isFree,
      isVirtual,
      startDateFrom,
      startDateTo,
      limit = 20,
      offset = 0,
      sortBy = 'startDate',
      search,
    } = filters;

    console.log(`[EventService] Fetching events with search: "${search || ''}", category: ${categoryId || 'all'}`);

    const where: any = {
      status,
    };

    if (categoryId) where.categoryId = categoryId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (isFree !== undefined) where.isFree = isFree;
    if (isVirtual !== undefined) where.isVirtual = isVirtual;

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
        {
          organizer: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    console.log('[EventService] Prisma where:', JSON.stringify(where, null, 2));

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    const orderBy: any = {};
    if (sortBy === 'startDate') {
      orderBy.startDate = 'asc';
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = 'desc';
    } else if (sortBy === 'viewCount') {
      orderBy.viewCount = 'desc';
    }

    const events = await prisma.event.findMany({
      where,
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
            reviews: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    const total = await prisma.event.count({ where });

    return {
      events,
      total,
      limit,
      offset,
    };
  },

  // Get event by ID
  async getEventById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
        _count: {
          select: {
            attendees: true,
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    if (event) {
      // Increment view count
      await prisma.event.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return event;
  },

  // Get event by slug
  async getEventBySlug(slug: string) {
    return await prisma.event.findUnique({
      where: { slug },
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
        _count: {
          select: {
            attendees: true,
            reviews: true,
          },
        },
      },
    });
  },

  // Update event
  async updateEvent(id: string, data: any, userId: string, isAdmin: boolean = false) {
    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id },
      select: { organizerId: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId !== userId && !isAdmin) {
      throw new Error('Unauthorized: You can only update your own events');
    }

    // Update slug if title changed
    let updateData = { ...data };
    if (data.title) {
      const baseSlug = generateSlug(data.title);
      const slug = await ensureUniqueSlug(baseSlug, id);
      updateData.slug = slug;
    }

    return await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        organizer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  },

  // Delete event
  async deleteEvent(id: string, userId: string) {
    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id },
      select: { organizerId: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new Error('Unauthorized: You can only delete your own events');
    }

    return await prisma.event.delete({
      where: { id },
    });
  },

  // Publish event
  async publishEvent(id: string, userId: string) {
    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id },
      select: { organizerId: true, status: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new Error('Unauthorized: You can only publish your own events');
    }

    return await prisma.event.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
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
      },
    });
  },

  // Get user's created events
  async getUserEvents(userId: string, status?: string) {
    const where: any = { organizerId: userId };
    if (status) where.status = status;

    return await prisma.event.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
