import assert from "node:assert/strict";
import test from "node:test";
import { getTableName } from "drizzle-orm";
import { integer } from "drizzle-orm/pg-core";

import { siteConfig } from "../config/site";
import { createTable } from "../lib/db/table-creator";

test("LockedIn branding preserves the existing database table namespace", () => {
  assert.equal(siteConfig.name, "LockedIn");
  const table = createTable("branding_probe", { id: integer("id") });
  assert.equal(getTableName(table), "lipi_branding_probe");
});
