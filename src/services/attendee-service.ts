import prisma from '../lib/prisma.js';

export const attendeeService = {
  // Register for event
  async registerForEvent(eventId: string, userId: string, data: any = {}) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        capacity: true,
        isUnlimited: true,
        isFree: true,
        price: true,
        status: true,
        _count: {
          select: {
            attendees: {
              where: {
                status: {
                  in: ['REGISTERED', 'ATTENDED'],
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new Error('Event is not published');
    }

    // Check if already registered
    const existing = await prisma.attendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'CANCELLED') {
        // Reactivate registration
        return await prisma.attendee.update({
          where: { id: existing.id },
          data: {
            status: 'REGISTERED',
            registeredAt: new Date(),
          },
        });
      }
      throw new Error('Already registered for this event');
    }

    // Check capacity
    if (!event.isUnlimited && event.capacity) {
      const currentAttendees = event._count.attendees;
      if (currentAttendees >= event.capacity) {
        // Add to waitlist
        return await prisma.attendee.create({
          data: {
            eventId,
            userId,
            status: 'WAITLIST',
            ticketType: data.ticketType || 'General',
            paymentStatus: event.isFree ? 'COMPLETED' : 'PENDING',
            paymentAmount: event.isFree ? 0 : event.price,
          },
        });
      }
    }

    // Create registration
    return await prisma.attendee.create({
      data: {
        eventId,
        userId,
        status: 'REGISTERED',
        ticketType: data.ticketType || 'General',
        paymentStatus: event.isFree ? 'COMPLETED' : 'PENDING',
        paymentAmount: event.isFree ? 0 : event.price,
      },
    });
  },

  // Cancel registration
  async cancelRegistration(eventId: string, userId: string) {
    const attendee = await prisma.attendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!attendee) {
      throw new Error('Registration not found');
    }

    if (attendee.status === 'CANCELLED') {
      throw new Error('Registration already cancelled');
    }

    return await prisma.attendee.update({
      where: { id: attendee.id },
      data: {
        status: 'CANCELLED',
      },
    });
  },

  // Get attendees for event (organizer or admin)
  async getEventAttendees(eventId: string, userId: string, role: string = 'USER') {
    // Verify organizer
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId !== userId && role !== 'ADMIN') {
      throw new Error('Unauthorized: Only event organizer or admin can view attendees');
    }

    return await prisma.attendee.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
  },

  // Get attendee count
  async getAttendeeCount(eventId: string) {
    return await prisma.attendee.count({
      where: {
        eventId,
        status: {
          in: ['REGISTERED', 'ATTENDED'],
        },
      },
    });
  },

  // Check if user is registered
  async isUserRegistered(eventId: string, userId: string) {
    const attendee = await prisma.attendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    return attendee && attendee.status !== 'CANCELLED';
  },

  // Get user's registered events
  async getUserRegisteredEvents(userId: string) {
    return await prisma.attendee.findMany({
      where: {
        userId,
        status: {
          in: ['REGISTERED', 'ATTENDED'],
        },
      },
      include: {
        event: {
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
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });
  },
};
