import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'JWT_TOKEN_SECRET_KEY';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '30m'; // Short-lived
console.log('ACCESS_TOKEN_EXPIRES:', ACCESS_TOKEN_EXPIRES); // Debug log

const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d'; // Long-lived

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface RefreshTokenInfo {
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserData {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  type: string;
  iat?: number;
  exp?: number;
}

export const authService = {
  /**
   * Generate a pair of access and refresh tokens
   */
  generateTokenPair: async (
    user: UserData,
    tokenInfo?: RefreshTokenInfo
  ): Promise<TokenPair> => {
    // Create access token (short-lived)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES } as SignOptions
    );

    // Generate refresh token (random string)
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');

    // Calculate refresh token expiration
    const refreshTokenExpiresAt = new Date();
    const days = parseInt(REFRESH_TOKEN_EXPIRES.replace('d', ''));
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + days);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
        deviceInfo: tokenInfo?.deviceInfo,
        ipAddress: tokenInfo?.ipAddress,
        userAgent: tokenInfo?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES,
      refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken: async (
    refreshTokenValue: string,
    tokenInfo?: RefreshTokenInfo
  ): Promise<TokenPair> => {
    // Find and validate refresh token
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (
      !refreshToken ||
      refreshToken.isRevoked ||
      refreshToken.expiresAt < new Date()
    ) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new token pair
    const tokens = await authService.generateTokenPair(
      refreshToken.user,
      tokenInfo
    );

    // Invalidate old refresh token (token rotation for security)
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { isRevoked: true },
    });

    return tokens;
  },

  /**
   * Revoke a specific refresh token
   */
  revokeRefreshToken: async (refreshTokenValue: string): Promise<void> => {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue },
      data: { isRevoked: true },
    });
  },

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  revokeAllUserTokens: async (userId: string): Promise<void> => {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  },

  /**
   * Get all active refresh tokens for a user (for session management)
   */
  getUserTokens: async (userId: string) => {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Revoke a specific session by token ID
   */
  revokeSession: async (userId: string, tokenId: string): Promise<void> => {
    await prisma.refreshToken.updateMany({
      where: {
        id: tokenId,
        userId, // Security: ensure user can only revoke their own tokens
      },
      data: { isRevoked: true },
    });
  },

  /**
   * Clean up expired and revoked refresh tokens (maintenance function)
   */
  cleanupExpiredTokens: async (): Promise<number> => {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ isRevoked: true }, { expiresAt: { lt: new Date() } }],
      },
    });

    return result.count;
  },

  /**
   * Validate access token
   */
  validateAccessToken: (token: string) => {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        payload: {
          userId: payload.userId,
          email: payload.email,
          username: payload.username,
          role: payload.role,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  },

  /**
   * Extract device info from request headers
   */
  extractDeviceInfo: (headers: Record<string, string>): RefreshTokenInfo => {
    const userAgent = headers['user-agent'] || 'Unknown';
    const xForwardedFor = headers['x-forwarded-for'];
    const xRealIp = headers['x-real-ip'];
    const cfConnectingIp = headers['cf-connecting-ip'];

    // Get IP address (priority: CloudFlare > X-Real-IP > X-Forwarded-For > fallback)
    const ipAddress =
      cfConnectingIp ||
      xRealIp ||
      (xForwardedFor ? xForwardedFor.split(',')[0].trim() : undefined) ||
      'Unknown';

    // Extract device info from user agent
    let deviceInfo = 'Unknown Device';
    if (userAgent && userAgent !== 'Unknown') {
      if (userAgent.includes('Mobile')) {
        deviceInfo = 'Mobile Device';
      } else if (userAgent.includes('Tablet')) {
        deviceInfo = 'Tablet';
      } else if (userAgent.includes('Chrome')) {
        deviceInfo = 'Chrome Browser';
      } else if (userAgent.includes('Firefox')) {
        deviceInfo = 'Firefox Browser';
      } else if (userAgent.includes('Safari')) {
        deviceInfo = 'Safari Browser';
      } else {
        deviceInfo = 'Desktop Browser';
      }
    }

    return {
      deviceInfo,
      ipAddress,
      userAgent: userAgent.substring(0, 255), // Limit length for database
    };
  },
};

export default authService;
