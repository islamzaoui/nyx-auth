# @nyx-auth/drizzle-adapter

Drizzle ORM adapter for [@nyx-auth/core](https://github.com/islamzaoui/nyx-auth/tree/main/packages/core).

## Installation

```bash
bun add @nyx-auth/drizzle-adapter @nyx-auth/core drizzle-orm
```

## Usage

### SQLite

```ts
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { Nyx } from "@nyx-auth/core";

const nyx = new Nyx({
    adapter: DrizzleAdapter.sqlite({ db, tables: { sessions, users } }),
});
```

### PostgreSQL

```ts
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { Nyx } from "@nyx-auth/core";

const nyx = new Nyx({
    adapter: DrizzleAdapter.postgres({ db, tables: { sessions, users } }),
});
```

### MySQL

```ts
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { Nyx } from "@nyx-auth/core";

const nyx = new Nyx({
    adapter: DrizzleAdapter.mysql({ db, tables: { sessions, users } }),
});
```

### Constructor

The static factory methods are the recommended approach, but you can also use the constructor directly:

```ts
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";

const adapter = new DrizzleAdapter({
    dialect: "sqlite", // "sqlite" | "postgres" | "mysql"
    db,
    tables: { sessions, users },
});
```

## Table schema

Your session and user tables **must** include the following base columns. Additional custom attributes are optional.

### Session table (SQLite example)

```ts
import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    secretHash: blob("secret_hash", { mode: "buffer" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }).notNull(),
    // ... custom attributes
});
```

### User table (SQLite example)

```ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id")
        .primaryKey()
        .$default(() => crypto.randomUUID()),
    // ... custom attributes (email, passwordHash, etc.)
});
```

### Base columns reference

| Session table    | Type                    |
| ---------------- | ----------------------- |
| `id`             | `text` (PK)             |
| `userId`         | `text` (FK → user)      |
| `secretHash`     | `blob` / `Uint8Array`   |
| `createdAt`      | `timestamp` / `integer` |
| `lastVerifiedAt` | `timestamp` / `integer` |

| User table | Type        |
| ---------- | ----------- |
| `id`       | `text` (PK) |

For PostgreSQL and MySQL, use the corresponding column types from `drizzle-orm/pg-core` and `drizzle-orm/mysql-core`.

### Recommended indexes

Index the session table's `userId` column — it is used to delete all of a user's sessions and to join sessions with users, so leaving it unindexed causes a table scan on every `validateToken` call and every sign-out:

```ts
// drizzle-orm/sqlite-core
sqliteTable(
    "sessions",
    {
        // ...columns
    },
    (t) => [index("sessions_user_id_idx").on(t.userId)],
);
```

## Type inference

The adapter automatically infers your custom attribute types from the drizzle table definitions, so no manual type annotations are needed.

## Table types

The package exports table type helpers for each dialect:

```ts
import type {
    SQLiteSessionTable, SQLiteUserTable,
    PgSessionTable,    PgUserTable,
    MySQLSessionTable, MySQLUserTable,
} from "@nyx-auth/drizzle-adapter";
```

Use them to annotate table variables when you need to define reusable type utilities or constrain generic functions that operate on session/user tables.
