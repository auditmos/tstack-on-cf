export { createClient, deleteClient, getClient, getClients, updateClient } from "./queries";

export type { Client, ClientCreateInput } from "./schema";

export {
	ClientCreateRequestSchema,
	ClientUpdateRequestSchema,
	IdParamSchema,
	PaginationRequestSchema,
} from "./schema";
