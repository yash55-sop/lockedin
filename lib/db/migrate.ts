import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const runMigrate = async () => {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Set DATABASE_URL in .env.local before running migrations."
    );
  const { db } = await import(".");
  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: "lib/db/migrations" });

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
