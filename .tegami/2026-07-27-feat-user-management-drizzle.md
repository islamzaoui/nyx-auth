---
packages:
  "npm:@nyx-auth/drizzle-adapter": minor
---

## User table support & session-user join

- Added `users` table support across all three drivers (SQLite, PostgreSQL, MySQL)
- Implemented user CRUD operations: `insertUser`, `findUserById`, `updateUserbyId`, `deleteUserById`
- Implemented `findSessionWithUserById` using `INNER JOIN` for combined session+user lookup
- Exported user table type helpers: `SQLiteUserTable`, `PgUserTable`, `MySQLUserTable`
- Updated static factory methods to require `tables: { sessions, users }`
- Added comprehensive README with table schema examples and type inference guide
