import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ApiError, toApiError } from "@/core/errors";
import type { Client, ClientCreateInput } from "@/db/client";

const API_BASE = "/api/clients";

async function fetchClients() {
	const res = await fetch(API_BASE);
	if (!res.ok) throw await toApiError(res, "Failed to fetch clients");
	return res.json() as Promise<{ data: Client[]; pagination: { total: number } }>;
}

async function apiCreateClient(data: ClientCreateInput) {
	const res = await fetch(API_BASE, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) throw await toApiError(res, "Failed to create client");
	const body = (await res.json()) as { data: Client };
	return body.data;
}

async function apiUpdateClient({ id, ...data }: { id: string } & Partial<ClientCreateInput>) {
	const res = await fetch(`${API_BASE}/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) throw await toApiError(res, "Failed to update client");
	const body = (await res.json()) as { data: Client };
	return body.data;
}

async function apiDeleteClient(id: string) {
	const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
	if (!res.ok) throw await toApiError(res, "Failed to delete client");
}

const CLIENT_FIELDS = ["name", "surname", "email"] as const;
type ClientField = (typeof CLIENT_FIELDS)[number];

function isClientField(value: string | undefined): value is ClientField {
	return CLIENT_FIELDS.some((field) => field === value);
}

interface PlacedError {
	fields: Partial<Record<ClientField, string>>;
	form: string | null;
}

/** Where a failed save is shown: under the field the API named, or once for the whole form. */
function placeError(error: Error | null): PlacedError {
	if (error instanceof ApiError && isClientField(error.field)) {
		return { fields: { [error.field]: error.message }, form: null };
	}
	return { fields: {}, form: error?.message ?? null };
}

interface FieldProps extends React.ComponentProps<typeof Input> {
	name: ClientField;
	label: string;
	error?: string;
}

/** A labelled input that shows, and announces to assistive tech, the error the API pinned to it. */
function Field({ name, label, error, ...inputProps }: FieldProps) {
	const errorId = `${name}-error`;
	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<Input
				id={name}
				name={name}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				{...inputProps}
			/>
			{error && (
				<p id={errorId} className="text-sm text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}

export function ClientsPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingClient, setEditingClient] = useState<Client | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["clients"],
		queryFn: fetchClients,
	});

	const createMutation = useMutation({
		mutationFn: apiCreateClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setDialogOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: apiUpdateClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setEditingClient(null);
			setDialogOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: apiDeleteClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
		},
	});

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const values = {
			name: formData.get("name") as string,
			surname: formData.get("surname") as string,
			email: formData.get("email") as string,
		};

		if (editingClient) {
			updateMutation.mutate({ id: editingClient.id, ...values });
		} else {
			createMutation.mutate(values);
		}
	}

	// A mutation keeps its error until reset, so a reopened dialog would show the last failure.
	function openDialog(client: Client | null) {
		createMutation.reset();
		updateMutation.reset();
		setEditingClient(client);
		setDialogOpen(true);
	}

	const isMutating = createMutation.isPending || updateMutation.isPending;
	const saveError = placeError(createMutation.error || updateMutation.error);

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-4xl p-6">
				<div className="mb-6 flex items-center gap-4">
					<Link to="/">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>
					</Link>
					<div className="flex items-center gap-2">
						<Users className="h-6 w-6" />
						<h1 className="text-2xl font-bold">Clients</h1>
					</div>
				</div>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>{data ? `${data.pagination.total} clients` : "Clients"}</CardTitle>
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<Button size="sm" onClick={() => openDialog(null)}>
									<Plus className="mr-2 h-4 w-4" />
									Add Client
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>{editingClient ? "Edit Client" : "New Client"}</DialogTitle>
								</DialogHeader>
								<form onSubmit={handleSubmit} className="space-y-4">
									<Field
										name="name"
										label="Name"
										required
										maxLength={30}
										defaultValue={editingClient?.name ?? ""}
										error={saveError.fields.name}
									/>
									<Field
										name="surname"
										label="Surname"
										required
										maxLength={30}
										defaultValue={editingClient?.surname ?? ""}
										error={saveError.fields.surname}
									/>
									<Field
										name="email"
										label="Email"
										type="email"
										required
										defaultValue={editingClient?.email ?? ""}
										error={saveError.fields.email}
									/>
									{saveError.form && <p className="text-sm text-destructive">{saveError.form}</p>}
									<Button type="submit" disabled={isMutating} className="w-full">
										{isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										{editingClient ? "Update" : "Create"}
									</Button>
								</form>
							</DialogContent>
						</Dialog>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="flex justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						)}
						{error && <p className="py-4 text-center text-sm text-destructive">{error.message}</p>}
						{data && data.data.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No clients yet. Add one to get started.
							</p>
						)}
						{data && data.data.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Surname</TableHead>
										<TableHead>Email</TableHead>
										<TableHead className="w-24" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.data.map((client) => (
										<TableRow key={client.id}>
											<TableCell>{client.name}</TableCell>
											<TableCell>{client.surname}</TableCell>
											<TableCell>{client.email}</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Button variant="ghost" size="sm" onClick={() => openDialog(client)}>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => deleteMutation.mutate(client.id)}
														disabled={deleteMutation.isPending}
													>
														<Trash2 className="h-4 w-4 text-destructive" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
