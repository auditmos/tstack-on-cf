import { z } from "zod";

// Domain model
export const ClientSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	surname: z.string(),
	email: z.string().email(),
});
export type Client = z.infer<typeof ClientSchema>;

// Create request
export const ClientCreateRequestSchema = z.object({
	name: z.string().min(1, "Name is required").max(30),
	surname: z.string().min(1, "Surname is required").max(30),
	email: z.string().email("Invalid email format"),
});
export type ClientCreateInput = z.infer<typeof ClientCreateRequestSchema>;

// Update request
export const ClientUpdateRequestSchema = z
	.object({
		name: z.string().min(1).max(30).optional(),
		surname: z.string().min(1).max(30).optional(),
		email: z.string().email().optional(),
	})
	.refine((data) => data.name || data.surname || data.email, {
		message: "At least one field is required",
	});
export type ClientUpdateInput = z.infer<typeof ClientUpdateRequestSchema>;

// Pagination
export const PaginationRequestSchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(10),
	offset: z.coerce.number().min(0).default(0),
});
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export const PaginationMetaSchema = z.object({
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
	hasMore: z.boolean(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// Response
export const ClientListResponseSchema = z.object({
	data: z.array(ClientSchema),
	pagination: PaginationMetaSchema,
});
export type ClientListResponse = z.infer<typeof ClientListResponseSchema>;

// Params
export const IdParamSchema = z.object({
	id: z.string().uuid("Invalid ID format"),
});

// Error
export const ErrorResponseSchema = z.object({
	error: z.string(),
});
