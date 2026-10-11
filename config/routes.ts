/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 */
export const publicRoutes = [
  "/",
  "/terms",
  "/privacy",
  "/pricing",
  "/templates",
  "/reset-password",
];

/**
 * An array of routes that are used for authentication
 * These routes will redirect logged in users to `DEFAULT_LOGIN_REDIRECT`
 */
export const authRoutes = ["/login", "/signup"];

/**
 * The default redirect path after a user logs in
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
