import { createHono } from './factory';
import healthEndpoint from '@/hono/api/health';
import demoEndpoint from '@/hono/api/demo';

export const apiHono = createHono()
  .basePath('/api');

apiHono.route("/health", healthEndpoint);
apiHono.route("/demo", demoEndpoint);