"use strict";

const fs = require("fs");
const path = require("path");

const BASELINE_MIGRATION = "20260101000000_baseline";
const sourceRoot = path.resolve("prisma");
const targetRoot = path.resolve("backups/baseline-only-prisma");
const sourceMigration = path.join(
  sourceRoot,
  "migrations",
  BASELINE_MIGRATION,
  "migration.sql",
);

for (const requiredFile of [
  path.join(sourceRoot, "schema.prisma"),
  path.join(sourceRoot, "migrations", "migration_lock.toml"),
  sourceMigration,
]) {
  if (!fs.statSync(requiredFile).isFile()) {
    throw new Error(`Required baseline file is missing: ${requiredFile}`);
  }
}

fs.rmSync(targetRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(targetRoot, "migrations", BASELINE_MIGRATION), {
  recursive: true,
});
fs.copyFileSync(
  path.join(sourceRoot, "schema.prisma"),
  path.join(targetRoot, "schema.prisma"),
);
fs.copyFileSync(
  path.join(sourceRoot, "migrations", "migration_lock.toml"),
  path.join(targetRoot, "migrations", "migration_lock.toml"),
);
fs.copyFileSync(
  sourceMigration,
  path.join(targetRoot, "migrations", BASELINE_MIGRATION, "migration.sql"),
);

const migrationDirectories = fs
  .readdirSync(path.join(targetRoot, "migrations"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
if (
  migrationDirectories.length !== 1 ||
  migrationDirectories[0] !== BASELINE_MIGRATION
) {
  throw new Error("Baseline-only Prisma bundle contains an unexpected migration");
}

console.log(
  `Prepared isolated Prisma history containing only ${BASELINE_MIGRATION}`,
);
