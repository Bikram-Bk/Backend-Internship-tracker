import bcrypt from 'bcrypt';
import type { User } from '../generated/prisma/index.js';
import prisma from '../lib/prisma.js';
export const userService = {
  create: async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'role'>
  ) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    return prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
  get: async (id: string) => {
    if (!id) {
      throw new Error('User ID is required');
    }
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
  findByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  verifyPassword: async (email: string, password: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        password: true,
      },
    });

    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.password);
  },

  login: async (email: string, password: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          password: true,
          role: true,
          balance: true,
        },
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Return user data (auth service will handle token generation)
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            balance: user.balance,
          },
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  },

  updateProfile: async (
    userId: string,
    updateData: { username?: string; phone?: string }
  ) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  getAll: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  getStats: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    let transactions = [];

    if (user.role === 'ADMIN') {
      // Admin sees Commissions
      const attendees = await prisma.attendee.findMany({
        where: { platformFee: { gt: 0 } },
        include: { event: true, user: true },
        orderBy: { registeredAt: 'desc' }
      });
      
      transactions = attendees.map(a => ({
        id: a.id,
        type: 'COMMISSION',
        title: `Commission from ${a.event.title}`,
        subtitle: `Sold to ${a.user?.username || 'Guest'}`,
        amount: Number(a.platformFee),
        fee: 0,
        date: a.registeredAt
      }));
    } else {
        // Organizer sees Ticket Sales
        const attendees = await prisma.attendee.findMany({
            where: { 
                event: { organizerId: userId },
                paymentStatus: 'COMPLETED'
            },
            include: { event: true, user: true },
            orderBy: { registeredAt: 'desc' }
        });

        transactions = attendees.map(a => {
            const amount = Number(a.paymentAmount || 0);
            const fee = Number(a.platformFee || 0);
            // Organizer gets: Amount - Fee
            return {
                id: a.id,
                type: 'SALE',
                title: `Ticket Sale: ${a.event.title}`,
                subtitle: `Sold to ${a.user?.username || 'Guest'}`,
                amount: amount - fee,
                fee: fee, // Show how much fee was taken
                date: a.registeredAt
            };
        });
    }

    return { transactions };
  }
};
