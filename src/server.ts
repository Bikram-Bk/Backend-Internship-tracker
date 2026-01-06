import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { serveStatic } from '@hono/node-server/serve-static';
import authRoutes from './routes/auth.js';
import dailyLog from './routes/dailylog.js';
import { corsMiddleware } from './middleware/cors.js';
import userRoutes from './routes/user.js';
import categoryRoutes from './routes/category.js';
import eventRoutes from './routes/event.js';
import attendeeRoutes from './routes/attendee.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payment.js';
import settingsRoutes from './routes/settings.js';
import payoutRoutes from './routes/payout.js';

const app = new Hono();

app.use('*', logger());
app.use('*', corsMiddleware);
app.use('*', timeout(30000));
app.use('*', secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginOpenerPolicy: 'unsafe-none',
}));
app.use('*', prettyJSON());

app.notFound(c => {
  return c.json(
    {
      success: false,
      error: 'Route not found',
      path: c.req.path,
    },
    404
  );
});

// Serve static files for uploads with CORS headers
app.use('/uploads/*', async (c, next) => {
  // Add CORS headers for static files
  const origin = c.req.header('Origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  c.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  c.header('Cross-Origin-Resource-Policy', 'cross-origin');
  c.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  
  await next();
});
app.use('/uploads/*', serveStatic({ root: './' }));

app.route('/api/auth/', authRoutes);
app.route('/api', dailyLog);
app.route('/api/users', userRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/events', attendeeRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/payouts', payoutRoutes);

app.get('/', c => {
  return c.json(
    {
      success: true,
      message: 'Welcome to Hono Server',
    },
    200
  );
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  info => {
    console.log(`🚀 Server is running on http://localhost:${info.port}`);
  }
);
