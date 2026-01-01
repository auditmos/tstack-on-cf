import { createHono } from '@/hono/factory';

const healthEndpoint = createHono()

healthEndpoint.get("/", (c) =>
  c.json({
    name: "tstack-on-cf",
    version: "0.0.1"
  }),
);

export default healthEndpoint;