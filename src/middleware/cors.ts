import type { MiddlewareHandler } from 'hono';

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000', // React development server
  'http://localhost:3001', // Alternative React port
  'http://localhost:5173', // Vite development server
  'http://localhost:5174', // Alternative Vite port
  'http://localhost:8080', // General development port
  'https://your-domain.com', // Production domain (replace with actual)
  'https://www.your-domain.com', // Production www domain (replace with actual)
  'https://59cqvp91-3001.inc1.devtunnels.ms',
  'http://localhost:5555', // React development server
];

// Environment-based origins
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:*'); // Allow any localhost port in development
}

if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin =>
    origin.trim()
  );
  allowedOrigins.push(...envOrigins);
}

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('Origin');
  // Check if origin is allowed
  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV === 'development' &&
      origin.startsWith('http://localhost:'));

  if (isAllowed && origin) {
    c.header('Access-Control-Allow-Origin', origin);
  }
  c.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  c.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Access-Control-Expose-Headers', '*');

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    // Always send CORS headers for OPTIONS
    return new Response(null, { status: 204, headers: c.res.headers });
  }

  await next();
};

// Request ID middleware for tracking requests
export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
};

// Rate limiting middleware (basic implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
