import { COOKIE_NAME } from "../shared/const.js";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { createLocalSession, loginPasswordUser, registerPasswordUser, setLocalSessionCookie } from "./_core/localAuth.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import * as db from "./db.js";

const rideId = z.string().uuid();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const user = ctx.user;
      return user ? {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastSignedIn: user.lastSignedIn,
      } : null;
    }),
    register: publicProcedure.input(z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(254),
      password: z.string().min(8).max(128),
    })).mutation(async ({ ctx, input }) => {
      const user = await registerPasswordUser(input, ctx.req);
      const token = await createLocalSession(user.openId, user.name ?? "");
      setLocalSessionCookie(ctx.res, token);
      return user;
    }),
    login: publicProcedure.input(z.object({
      email: z.string().trim().email().max(254),
      password: z.string().min(1).max(128),
    })).mutation(async ({ ctx, input }) => {
      const user = await loginPasswordUser(input, ctx.req);
      const token = await createLocalSession(user.openId, user.name ?? "");
      setLocalSessionCookie(ctx.res, token);
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ride: router({
    list: protectedProcedure.query(({ ctx }) => db.listRides(ctx.user.openId)),
    create: protectedProcedure.input(z.object({
      pickup: z.string().trim().min(2).max(500),
      dropoff: z.string().trim().min(2).max(500),
      pickupLat: z.number().min(-90).max(90).optional(),
      pickupLng: z.number().min(-180).max(180).optional(),
    })).mutation(({ ctx, input }) => db.createRide({ ...input, riderKey: ctx.user.openId })),
    cancel: protectedProcedure.input(z.object({ rideId })).mutation(({ ctx, input }) => db.cancelRide(input.rideId, ctx.user.openId)),
    updateLocation: adminProcedure.input(z.object({
      rideId,
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })).mutation(({ input }) => db.updateRideLocation({ rideId: input.rideId, lat: input.lat, lng: input.lng })),
  }),
  message: router({
    list: protectedProcedure.query(({ ctx }) => db.listMessages(ctx.user.openId)),
    markRead: protectedProcedure.input(z.object({ rideId, messageId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      db.markMessageRead({ id: input.messageId, rideId: input.rideId, riderKey: ctx.user.openId }),
    ),
  }),
});

export type AppRouter = typeof appRouter;
