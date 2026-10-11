import { redirect } from "next/navigation";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { authConfig } from "@/config/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/config/routes";
import { db } from "./db";
import { dbAccounts, users, verificationTokens } from "./db/schema";
import { loginSchema } from "./validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: dbAccounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const input = parsed.data;
        const user = await db.query.users.findFirst({
          where: (u, { eq }) =>
            input.type === "email" ?
              eq(u.email, input.email)
            : eq(u.username, input.username),
        });
        if (!user?.password || !(await compare(input.password, user.password)))
          return null;
        return user;
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    newUser: "/signup",
  },

  events: {
    linkAccount: async ({ user }) => {
      await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, user.id!));
    },
  },

  callbacks: {
    session: async ({ session, token }) => {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.username = token.username;
      }

      return session;
    },

    jwt: async ({ token }) => {
      if (!token.sub) return token;
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, token.sub!),
      });

      if (user) {
        token.username = user.username;
      }

      return token;
    },

    redirect: ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}${DEFAULT_LOGIN_REDIRECT}`;
    },
  },
});

/**
 * Gets the current user from the server session
 *
 * @returns The current user
 */
export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

/**
 * Checks if the current user is authenticated
 * If not, redirects to the login page
 */
export const checkAuth = async () => {
  const session = await auth();
  if (!session?.user) redirect("/login");
};
