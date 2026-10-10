import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const.js";
import { parse as parseCookieHeader } from "cookie";
import { getLocalSessionUser } from "./localAuth.js";
import { sdk } from "./sdk.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  user = await getLocalSessionUser(opts.req);
  if (user) {
    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  }

  const hasSession = Boolean(
    parseCookieHeader(opts.req.headers.cookie ?? "")[COOKIE_NAME]
      || opts.req.headers.authorization?.startsWith("Bearer ")
      || opts.req.path.startsWith("/api/scheduled/"),
  );
  if (hasSession) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
