import clientsEndpoint from "@/hono/api/clients";
import demoEndpoint from "@/hono/api/demo";
import healthEndpoint from "@/hono/api/health";
import { createHono } from "./factory";

export const apiHono = createHono().basePath("/api");

apiHono.route("/health", healthEndpoint);
apiHono.route("/demo", demoEndpoint);
apiHono.route("/clients", clientsEndpoint);
