import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_COST = 16_384;
const SESSION_ISSUER = "rideline-local";
const SESSION_AUDIENCE = "rideapp";
const MAX_AUTH_ATTEMPTS = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

type AttemptBucket = { count: number; resetAt: number };
const attempts = new Map<string, AttemptBucket>();

function deriveKey(password: string, salt: string, length: number, cost: number, maxmem: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, { N: cost, maxmem }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function sessionKey() {
  const secret = process.env.LOCAL_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LOCAL_AUTH_SECRET must be at least 32 characters; set it in the local .env file.");
  }
  return new TextEncoder().encode(secret);
}

function recordAttempt(req: Request) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    if (attempts.size > 10_000) {
      for (const [address, bucket] of attempts) {
        if (bucket.resetAt <= now) attempts.delete(address);
      }
    }
    return;
  }
  if (current.count >= MAX_AUTH_ATTEMPTS) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  }
  current.count += 1;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_COST, 64 * 1024 * 1024);
  return `scrypt$${PASSWORD_COST}$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, costValue, salt, keyHex] = encoded.split("$");
  const cost = Number(costValue);
  if (algorithm !== "scrypt" || !Number.isInteger(cost) || cost < 16_384 || cost > 65_536 || !salt || !keyHex || !/^[a-f0-9]{128}$/i.test(keyHex)) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, salt, expected.length, cost, 128 * 1024 * 1024);
  return timingSafeEqual(actual, expected);
}

function publicUser(user: User) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
  };
}

export async function registerPasswordUser(input: { name: string; email: string; password: string }, req: Request) {
  recordAttempt(req);
  const email = input.email.trim().toLowerCase();
  const existing = await db.getUserByEmail(email);
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Sign in instead." });
  }

  const openId = `local_${randomUUID()}`;
  try {
    const user = await db.createPasswordUser({
      openId,
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
    });
    return publicUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Sign in instead." });
    }
    throw error;
  }
}

export async function loginPasswordUser(input: { email: string; password: string }, req: Request) {
  recordAttempt(req);
  const user = await db.getUserByEmail(input.email.trim().toLowerCase());
  const encoded = user?.passwordHash;
  const valid = encoded ? await verifyPassword(input.password, encoded) : false;
  if (!user || !encoded || !valid) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
  }
  await db.updateLastSignedIn(user.openId);
  return publicUser({ ...user, lastSignedIn: new Date() });
}

export async function createLocalSession(openId: string, name: string) {
  return new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(sessionKey());
}

export async function getLocalSessionUser(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  let openId: string;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub.startsWith("local_")) return null;
    openId = payload.sub;
  } catch {
    return null;
  }
  const user = await db.getUserByOpenId(openId);
  return user?.passwordHash ? user : null;
}

export function setLocalSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions({} as Request),
    maxAge: ONE_YEAR_MS,
  });
}
