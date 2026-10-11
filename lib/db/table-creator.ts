import { pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Use to keep multiple projects schemas/tables in the same database.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
// Persisted SQL names are independent of display branding. Existing migrations
// and databases use lipi_* and must keep working after the LockedIn rename.
export const createTable = pgTableCreator((name) => `lipi_${name}`);
