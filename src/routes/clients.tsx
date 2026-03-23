import { createFileRoute } from "@tanstack/react-router";
import { ClientsPage } from "@/components/clients/clients-page";

export const Route = createFileRoute("/clients")({
	component: ClientsPage,
});
