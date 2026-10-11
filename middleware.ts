import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import NextAuth from "next-auth";

import type { NextRequest } from "next/server";

import { authConfig } from "./config/auth";
import {
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "./config/routes";
import { env } from "./lib/env";

const ratelimit =
  env.ENABLE_RATE_LIMITING === "true" && env.NODE_ENV === "production" ?
    new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(
        env.RATE_LIMITING_REQUESTS_PER_SECOND,
        "1s"
      ),
    })
  : null;

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  /* -----------------------------------------------------------------------------------------------
   * Rate limiting middleware
   * -----------------------------------------------------------------------------------------------*/

  if (ratelimit) {
    const id = getIP(req) || "anonymous";
    const { limit, remaining, reset, success } = await ratelimit.limit(id);

    if (!success) {
      return NextResponse.json(
        {
          error: {
            message: "Too many requests",
            limit,
            remaining,
            reset: `${reset - Date.now()}ms`,
          },
        },
        {
          status: 429,
          headers: {
            "x-ratelimit-limit": limit.toString(),
            "x-ratelimit-remaining": remaining.toString(),
          },
        }
      );
    }
  }

  /* -----------------------------------------------------------------------------------------------
   * Authentication middleware
   * -----------------------------------------------------------------------------------------------*/

  const { nextUrl } = req;
  if (publicRoutes.includes(nextUrl.pathname)) return NextResponse.next();
  const isLoggedIn = !!req.auth?.user;

  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }

    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    let from = nextUrl.pathname;
    if (nextUrl.search) {
      from += nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, nextUrl)
    );
  }

  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  // match all routes except static files, _next and api/auth
  matcher: ["/((?!.+\\.[\\w]+$|_next|api/auth).*)"],
};

function getIP(req: NextRequest): string {
  // @ts-expect-error ip is not available in NextRequest
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }
  return ip;
}
