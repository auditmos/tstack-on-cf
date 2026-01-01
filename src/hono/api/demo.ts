import { createHono } from '@/hono/factory';
import { z } from 'zod';

const demoEndpoint = createHono();

// GET /api/demo
demoEndpoint.get("/", (c) =>
  c.json({
    message: "Demo endpoint working",
    timestamp: new Date().toISOString(),
  }),
);

// GET /api/demo/hello?name=World
demoEndpoint.get("/hello", (c) => {
  const name = c.req.query('name') || 'World';
  return c.json({ greeting: `Hello, ${name}!` });
});

// GET /api/demo/users/:id
demoEndpoint.get("/users/:id", (c) => {
  const id = c.req.param('id');
  return c.json({
    userId: id,
    name: `User ${id}`,
  });
});

// POST /api/demo/echo
const EchoSchema = z.object({
  message: z.string().min(1),
});

demoEndpoint.post("/echo", async (c) => {
  const body = await c.req.json();
  const validated = EchoSchema.parse(body);
  return c.json({
    echoed: validated.message,
    length: validated.message.length,
  });
});

export default demoEndpoint;
