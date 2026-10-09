import { int, double, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

/** User accounts for local password auth and the optional Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Rider-key scoped demo bookings. Real dispatch integrations can attach a provider ID later. */
export const rides = mysqlTable(
  "rides",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    riderKey: varchar("riderKey", { length: 64 }).notNull(),
    pickup: varchar("pickup", { length: 500 }).notNull(),
    dropoff: varchar("dropoff", { length: 500 }).notNull(),
    pickupLat: double("pickupLat"),
    pickupLng: double("pickupLng"),
    status: mysqlEnum("status", ["requested", "assigned", "arriving", "in_progress", "completed", "cancelled"]).default("requested").notNull(),
    demoMode: int("demoMode").default(1).notNull(),
    driverName: varchar("driverName", { length: 120 }),
    vehicleName: varchar("vehicleName", { length: 120 }),
    vehiclePlate: varchar("vehiclePlate", { length: 32 }),
    locationLat: double("locationLat"),
    locationLng: double("locationLng"),
    locationUpdatedAt: timestamp("locationUpdatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ riderCreatedIdx: index("rides_rider_created_idx").on(table.riderKey, table.createdAt) }),
);

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

export const rideMessages = mysqlTable(
  "rideMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    rideId: varchar("rideId", { length: 36 }).notNull(),
    sender: varchar("sender", { length: 120 }).notNull(),
    body: text("body").notNull(),
    isRead: int("isRead").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ rideCreatedIdx: index("ride_messages_ride_created_idx").on(table.rideId, table.createdAt) }),
);

export type RideMessage = typeof rideMessages.$inferSelect;
export type InsertRideMessage = typeof rideMessages.$inferInsert;
