import { createFileRoute } from "@tanstack/react-router";
import { ClientsPage } from "@/components/clients/clients-page";
import { clientsQueryOptions } from "@/components/clients/clients-query";

export const Route = createFileRoute("/clients")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.query(clientsQueryOptions);
	},
	pendingComponent: () => (
		<output className="block p-6 text-center text-muted-foreground">Loading clients…</output>
	),
	component: ClientsPage,
});
