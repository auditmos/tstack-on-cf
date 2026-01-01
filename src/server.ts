// DO NOT DELETE THIS FILE!!!
// This file is a good smoke test to make sure the custom server entry is working
import handler from "@tanstack/react-start/server-entry"; 
import { apiHono } from "@/hono/api";
console.log("[server-entry]: using custom server entry in 'src/server.ts'");

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {

    const url = new URL(request.url);
    
    // Hono API handling
    if (url.pathname.startsWith("/api/")) {
      return apiHono.fetch(request, env, ctx);
    }

    // TanStack Start handling
    return handler.fetch(request, {
      context: {
        fromFetch: true,

      },
    });
  },
};
