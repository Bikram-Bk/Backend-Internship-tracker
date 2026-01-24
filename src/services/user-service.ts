import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

import type { User } from '../generated/prisma/index.js';
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
    updateData: { username?: string; phone?: string; email?: string; avatar?: string }
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
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  cleanupExpiredTokens: async () => {
    try {
      const { passwordResetService } = await import(
        './password-reset-service.js'
      );
      const count = await passwordResetService.cleanupExpiredTokens();
      console.log(`Cleaned up ${count} expired/used password reset tokens`);
      return count;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  },
};
