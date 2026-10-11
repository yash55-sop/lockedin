import { cwd } from "process";
import { loadEnvConfig } from "@next/env";

import type { Config } from "drizzle-kit";

loadEnvConfig(cwd());

if (!process.env.DATABASE_URL) {
  console.error("'DATABASE_URL' is not set in the environment variables");
  process.exit(1);
}
export default {
  schema: "./lib/db/schema",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  verbose: true,
  dbCredentials: { url: process.env.DATABASE_URL },
  // Existing migrations and SQL tables keep their original namespace.
  tablesFilter: ["lipi_*"],
} satisfies Config;
