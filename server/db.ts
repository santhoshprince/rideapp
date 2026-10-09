import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertRide, rides, rideMessages, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("The managed database is not available.");
    return db;
  });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createPasswordUser(input: { openId: string; name: string; email: string; passwordHash: string }) {
  const db = await requireDb();
  await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    loginMethod: "password",
    role: "user",
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("New account could not be loaded after creation");
  return user;
}

export async function updateLastSignedIn(openId: string) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function createRide(input: {
  riderKey: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number;
  pickupLng?: number;
}) {
  const db = await requireDb();
  const id = randomUUID();
  const values: InsertRide = {
    id,
    riderKey: input.riderKey,
    pickup: input.pickup,
    dropoff: input.dropoff,
    pickupLat: input.pickupLat ?? null,
    pickupLng: input.pickupLng ?? null,
    status: "requested",
    demoMode: 1,
    driverName: "Sample driver",
    vehicleName: "Comfort sedan",
    vehiclePlate: "DEMO • 042",
  };
  await db.insert(rides).values(values);
  await db.insert(rideMessages).values({
    rideId: id,
    sender: "Ride service",
    body: "Your request is saved in the demo. No taxi company or driver has been contacted; the car marker is a sample position until a real driver feed is connected.",
    isRead: 0,
  });
  return (await getRideById(id, input.riderKey))!;
}

export async function getRideById(id: string, riderKey: string) {
  const db = await requireDb();
  const result = await db.select().from(rides).where(and(eq(rides.id, id), eq(rides.riderKey, riderKey))).limit(1);
  return result[0] ?? null;
}

export async function listRides(riderKey: string) {
  const db = await requireDb();
  return db.select().from(rides).where(eq(rides.riderKey, riderKey)).orderBy(desc(rides.createdAt)).limit(10);
}

export async function cancelRide(id: string, riderKey: string) {
  const db = await requireDb();
  const ride = await getRideById(id, riderKey);
  if (!ride) return null;
  if (["requested", "assigned", "arriving"].includes(ride.status)) {
    await db.update(rides).set({ status: "cancelled" }).where(and(eq(rides.id, id), eq(rides.riderKey, riderKey)));
    await db.insert(rideMessages).values({
      rideId: id,
      sender: "Ride service",
      body: "This demo ride request was cancelled.",
      isRead: 0,
    });
  }
  return getRideById(id, riderKey);
}

export async function listMessages(riderKey: string) {
  const db = await requireDb();
  return db.select({
    id: rideMessages.id,
    rideId: rideMessages.rideId,
    sender: rideMessages.sender,
    body: rideMessages.body,
    isRead: rideMessages.isRead,
    createdAt: rideMessages.createdAt,
    pickup: rides.pickup,
    dropoff: rides.dropoff,
  }).from(rideMessages)
    .innerJoin(rides, eq(rideMessages.rideId, rides.id))
    .where(eq(rides.riderKey, riderKey))
    .orderBy(desc(rideMessages.createdAt))
    .limit(30);
}

export async function markMessageRead(input: { id: number; rideId: string; riderKey: string }) {
  const db = await requireDb();
  const ride = await getRideById(input.rideId, input.riderKey);
  if (!ride) return false;
  await db.update(rideMessages).set({ isRead: 1 }).where(and(eq(rideMessages.id, input.id), eq(rideMessages.rideId, input.rideId)));
  return true;
}

export async function updateRideLocation(input: { rideId: string; lat: number; lng: number }) {
  const db = await requireDb();
  const ride = await db.select({ id: rides.id }).from(rides).where(eq(rides.id, input.rideId)).limit(1);
  if (!ride[0]) return false;
  await db.update(rides).set({
    locationLat: input.lat,
    locationLng: input.lng,
    locationUpdatedAt: new Date(),
    demoMode: 0,
  }).where(eq(rides.id, input.rideId));
  return true;
}
