import type { Context, Next } from 'hono';

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        },
        403
      );
    }

    await next();
  };
}

// Shorthand for admin-only routes
export function requireAdmin() {
  return requireRole(['ADMIN']);
}

// Shorthand for moderator+ routes (moderator or admin)
export function requireModerator() {
  return requireRole(['MODERATOR', 'ADMIN']);
}

// Check if user is owner of resource or admin
export async function isOwnerOrAdmin(userId: string, resourceOwnerId: string, userRole: string): Promise<boolean> {
  return userId === resourceOwnerId || userRole === 'ADMIN';
}

// Check if user is moderator or admin
export function isModeratorOrAdmin(userRole: string): boolean {
  return userRole === 'MODERATOR' || userRole === 'ADMIN';
}
