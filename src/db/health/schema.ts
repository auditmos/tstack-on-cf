import { z } from "zod";

const DatabaseStatusSchema = z.enum(["connected", "disconnected"]);
export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;

const LivenessResponseSchema = z.object({
	status: z.literal("ok"),
	time: z.string(),
});
export type LivenessResponse = z.infer<typeof LivenessResponseSchema>;

const ReadinessResponseSchema = z.object({
	status: z.enum(["ok", "degraded"]),
	env: z.string(),
	service: z.string(),
	time: z.string(),
	database: DatabaseStatusSchema,
});
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
