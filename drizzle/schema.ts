import { doublePrecision, integer, pgEnum, pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";

/** User accounts for local password auth and the optional Manus OAuth flow. */
export const userRole = pgEnum("role", ["user", "admin"]);
export const rideStatus = pgEnum("status", ["requested", "assigned", "arriving", "in_progress", "completed", "cancelled"]);

const timestampConfig = { withTimezone: true, mode: "date" } as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", timestampConfig).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", timestampConfig).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Rider-key scoped demo bookings. Real dispatch integrations can attach a provider ID later. */
export const rides = pgTable(
  "rides",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    riderKey: varchar("riderKey", { length: 64 }).notNull(),
    pickup: varchar("pickup", { length: 500 }).notNull(),
    dropoff: varchar("dropoff", { length: 500 }).notNull(),
    pickupLat: doublePrecision("pickupLat"),
    pickupLng: doublePrecision("pickupLng"),
    status: rideStatus("status").default("requested").notNull(),
    demoMode: integer("demoMode").default(1).notNull(),
    driverName: varchar("driverName", { length: 120 }),
    vehicleName: varchar("vehicleName", { length: 120 }),
    vehiclePlate: varchar("vehiclePlate", { length: 32 }),
    locationLat: doublePrecision("locationLat"),
    locationLng: doublePrecision("locationLng"),
    locationUpdatedAt: timestamp("locationUpdatedAt", timestampConfig),
    createdAt: timestamp("createdAt", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", timestampConfig).defaultNow().notNull(),
  },
  table => ({ riderCreatedIdx: index("rides_rider_created_idx").on(table.riderKey, table.createdAt) }),
);

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

export const rideMessages = pgTable(
  "rideMessages",
  {
    id: serial("id").primaryKey(),
    rideId: varchar("rideId", { length: 36 }).notNull(),
    sender: varchar("sender", { length: 120 }).notNull(),
    body: text("body").notNull(),
    isRead: integer("isRead").default(0).notNull(),
    createdAt: timestamp("createdAt", timestampConfig).defaultNow().notNull(),
  },
  table => ({ rideCreatedIdx: index("ride_messages_ride_created_idx").on(table.rideId, table.createdAt) }),
);

export type RideMessage = typeof rideMessages.$inferSelect;
export type InsertRideMessage = typeof rideMessages.$inferInsert;
