import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import type { NextAuthConfig } from "next-auth";

import { env } from "@/lib/env";

export const authConfig: NextAuthConfig = {
  // NextAuth canonicalizes requests to the configured URL before Auth.js checks the host.
  trustHost: env.NEXTAUTH_URL ? true : undefined,
  secret:
    env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "development" ?
      "lipi-local-development-secret-change-before-deployment"
    : undefined),
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ?
      [
        GoogleProvider({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ?
      [
        GitHubProvider({
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        }),
      ]
    : []),
  ],
  session: { strategy: "jwt" },
};
