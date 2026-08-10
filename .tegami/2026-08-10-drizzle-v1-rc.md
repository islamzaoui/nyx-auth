---
packages:
  "npm:@nyx-auth/drizzle-adapter": minor
---

## Upgrade to drizzle-orm v1 Release Candidate

- Updated `drizzle-orm` and `drizzle-kit` to `^1.0.0-rc.4` (any `1.0.0-rc.x` release) for both the adapter and the hono-drizzle example
- Adapted to the v1 type renames: `PgAsyncDatabase`, `MySqlAsyncDatabase`, and `SQLiteAsyncDatabase` in the `DrizzleAdapterConfig` unions and driver factories
- Updated the `PgColumn`, `MySqlColumn`, and `SQLiteColumn` config shapes used by `AttributeColumn`, `BaseColumns`, and `UserBaseColumns` for the new v1 column config (dropped `columnType`/`baseColumn`, added `identity`)
- Removed the example's `pushSQLiteSchema` setup (dropped in v1) in favor of inline DDL through `db.$client.executeMultiple`