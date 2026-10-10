CREATE TYPE "public"."status" AS ENUM('requested', 'assigned', 'arriving', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "rideMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"rideId" varchar(36) NOT NULL,
	"sender" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"isRead" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"riderKey" varchar(64) NOT NULL,
	"pickup" varchar(500) NOT NULL,
	"dropoff" varchar(500) NOT NULL,
	"pickupLat" double precision,
	"pickupLng" double precision,
	"status" "status" DEFAULT 'requested' NOT NULL,
	"demoMode" integer DEFAULT 1 NOT NULL,
	"driverName" varchar(120),
	"vehicleName" varchar(120),
	"vehiclePlate" varchar(32),
	"locationLat" double precision,
	"locationLng" double precision,
	"locationUpdatedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "ride_messages_ride_created_idx" ON "rideMessages" USING btree ("rideId","createdAt");--> statement-breakpoint
CREATE INDEX "rides_rider_created_idx" ON "rides" USING btree ("riderKey","createdAt");