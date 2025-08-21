import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import authRoutes from './routes/auth.js';
import dailyLog from './routes/dailylog.js';
import geminiSummary from './routes/gemini.js';
import { corsMiddleware } from './middleware/cors.js';
import userRoutes from './routes/user.js';

const app = new Hono();

app.use('*', logger());
app.use('*', corsMiddleware);
app.use('*', timeout(30000));
app.use('*', secureHeaders());
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

app.route('/api/auth/', authRoutes);
app.route('/api', dailyLog);
app.route('/api/gemini', geminiSummary);
app.route('/api/users', userRoutes);

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
