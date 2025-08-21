import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const passwordResetService = {
  /**
   * Generate and store a password reset token for a user
   */
  generateResetToken: async (userId: string): Promise<string> => {
    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        used: true,
      },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId,
        expiresAt,
      },
    });

    return resetToken;
  },

  /**
   * Validate a password reset token
   */
  validateResetToken: async (token: string) => {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!resetToken) {
      throw new Error('Invalid reset token');
    }

    if (resetToken.used) {
      throw new Error('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    return resetToken;
  },

  /**
   * Reset user password using a valid token
   */
  resetPassword: async (token: string, newPassword: string) => {
    // Validate the token first
    const resetToken = await passwordResetService.validateResetToken(token);

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and mark token as used
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      // Mark token as used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return {
      success: true,
      user: resetToken.user,
    };
  },

  /**
   * Clean up expired and used tokens (for maintenance)
   */
  cleanupExpiredTokens: async () => {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
      },
    });

    return result.count;
  },

  /**
   * Get reset token info (for debugging/testing)
   */
  getTokenInfo: async (token: string) => {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  },
};
