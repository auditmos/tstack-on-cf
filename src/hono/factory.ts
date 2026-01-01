import { Hono } from "hono";

export const createHono = () => new Hono<{ Bindings: Env }>();