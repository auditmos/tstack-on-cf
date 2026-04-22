CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
