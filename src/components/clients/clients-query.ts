import { queryOptions } from "@tanstack/react-query";
import { listClients } from "@/core/functions/client-functions";

export const clientsQueryOptions = queryOptions({
	queryKey: ["clients"],
	queryFn: ({ signal }) => listClients({ signal }),
	staleTime: 30_000,
});
