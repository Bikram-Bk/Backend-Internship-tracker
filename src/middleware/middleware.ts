import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';

// JWT secret key - must match the one in user service
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-variable';

// Define types for JWT payload
interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

// Token blacklist for logout functionality
// In production, this should use Redis or another persistent store
export const tokenBlacklist = new Set<string>();

// Function to add a token to the blacklist
export const invalidateToken = (token: string): void => {
  tokenBlacklist.add(token);
};

// Extend Hono's Context to include the authenticated user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
    token: string; // Add token to context for logout functionality
  }
}

// JWT Authentication middleware
export const authMiddleware = async (c: Context, next: Next) => {
  // Get Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Authentication required',
      },
      401
    );
  }

  // Extract token from header
  const token = authHeader.split(' ')[1];

  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    return c.json(
      {
        success: false,
        error: 'Token has been invalidated',
      },
      401
    );
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Attach user info to context for use in route handlers
    c.set('user', decoded);
    c.set('token', token); // Store token in context for logout functionality

    await next();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid or expired token',
      },
      401
    );
  }
};
