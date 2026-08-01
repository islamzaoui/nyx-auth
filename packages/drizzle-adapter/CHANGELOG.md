## @nyx-auth/drizzle-adapter@0.2.0

### Follow the updated core adapter contract

- Changed `deleteSessionById` and `deleteSessionsByUserId` to return whether a row was deleted
- Removed `findSessionById` from the adapter
- Normalized MySQL affected-row reporting across mysql2 tuple and PlanetScale-style object results

### More robust MySQL inserts

- Wrapped MySQL session and user inserts in a transaction with a read-back, since MySQL has no `RETURNING`

### Validation & docs

- Added a constructor check that rejects sessions and users tables with the same name
- Documented driver support, recommended `userId` index, and `ON DELETE CASCADE` behavior in the README
- Documented a recommended `lastVerifiedAt` index for `deleteExpiredSessions` sweeps

### Expired session cleanup & hash type guard

- Added `deleteExpiredSessions(olderThan)` to the adapter, deleting sessions whose `lastVerifiedAt` is at or before the cutoff and returning the deleted count
- Updated the non-binary `secretHash` check to fail closed: a session stored with a TEXT `secretHash` column is treated as invalid instead of surfacing an `AdapterError`, which an attacker could otherwise use to probe which session ids exist

### Error wrapping via `.catch()`

- Reorganized the MySQL, PostgreSQL and SQLite driver methods to wrap failures with `.catch()` instead of `try/catch`

### User table support & session-user join

- Added `users` table support across all three drivers (SQLite, PostgreSQL, MySQL)
- Implemented user CRUD operations: `insertUser`, `findUserById`, `updateUserbyId`, `deleteUserById`
- Implemented `findSessionWithUserById` using `INNER JOIN` for combined session+user lookup
- Exported user table type helpers: `SQLiteUserTable`, `PgUserTable`, `MySQLUserTable`
- Updated static factory methods to require `tables: { sessions, users }`
- Added comprehensive README with table schema examples and type inference guide

## @nyx-auth/drizzle-adapter@0.1.0

### Initial Release of the official drizzle adapter for nyx-auth

- Supports MySQL, PostgreSQL, and SQLite drivers
- Exports `mysql`, `postgresql`, and `sqlite` adapter factories
