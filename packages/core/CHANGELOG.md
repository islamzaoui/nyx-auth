## @nyx-auth/core@0.2.0

### Namespaced API & user management

- Reorganized core into namespaced `nyx.session.*` and `nyx.user.*` APIs
- Added the `nyx.user` API: `create`, `get`, `updateAttributes`, `delete` and `$infer`
- Added `$infer` type getter to `nyx.session`

### Security hardening of session validation

- Made `validateToken` timing-safe by comparing against a fixed dummy hash, equalizing the hashing work of the "session not found" and "wrong secret" paths
- Added session token format validation before any database lookup
- Increased session id/secret length to 32 bytes
- Narrowed the session-id existence timing oracle: the dummy-hash comparison equalizes hashing work, though the database lookup cost still differs between found and missing sessions

### Required attribute mappers

- Made `session.mapSessionAttributes` and `user.mapUserAttributes` required — they strip sensitive columns (e.g. `passwordHash`) from the values exposed to the application
- Stripped reserved columns (`id`, `userId`, `secretHash`, `createdAt`, `lastVerifiedAt`) from session and user inserts

### Adapter contract changes

- Removed `findSessionById` from the `Adapter` interface — only the session+user join is used
- Changed `deleteSessionById` and `deleteSessionsByUserId` to return whether a row was deleted
- Changed `nyx.session.invalidate` and `invalidateAll` to return `boolean`
- Removed `nyx.session.get`

### Validation & docs

- Added `session.now` option to inject the clock for deterministic time in tests
- Added `TimeSpan` constructor validation for non-finite values and millisecond overflow
- Added `Nyx` constructor validation for `inactivityTimeout` and `activityCheckInterval` values
- Documented the full API with JSDoc
- Documented that `nyx.session.updateAttributes` ignores `undefined` fields — pass `null` to clear a column

### Session expiration sweep

- Added `nyx.session.invalidateExpiredSessions` to delete sessions that have exceeded the inactivity timeout

### Error wrapping via `.catch()`

- Reorganized `validateToken`, `invalidate`, `invalidateExpiredSessions` and `invalidateAll` to wrap failures with `.catch()` instead of `try/catch`

### Namespaced API & user management

- Reorganized core into namespaced `nyx.session.*` and `nyx.user.*` APIs
- Added user management (`create`, `get`, `updateAttributes`, `delete`)
- Added `DatabaseUser` interface to adapter contract
- Added `findSessionWithUserById` to adapter interface
- `validateToken` now returns `{ session, user }` combined object
- Extracted `UnexpectedError` into dedicated module with direct `cause` constructor
- Extracted crypto utilities (`generateSessionId`, `hashSecret`, `constantTimeEqual`) into `utils/crypto.ts`
- Renamed `$inferSession` to `nyx.session.$infer` and added `nyx.user.$infer`
- Expanded README with full API reference, error handling, and custom adapter guide

## @nyx-auth/core@0.1.0

### Replace module augmentation with generics

- Use generics instead of module augmentation to define session attributes.
- Fix usage section in README.md

### Refactor nyx types and mapper for better DX & add updateSessionAttributes method

- Refactored `Attributes` to a `{ select, insert }` generic shape and updated `Adapter`, `DatabaseSession`, `Session`, and related types accordingly
- Renamed `getSessionAttributes` to `mapSessionAttributes` for clarity
- Added `$inferSession` type inference getter
- Added `updateSessionAttributes(sessionId, attributes)` method
- `createSession` now returns `{ token, value: Session<Select> }` instead of `SessionWithToken`
- Exported `AdapterError` and `Attributes` from package entry
- Updated README example to reflect new API

## @nyx-auth/core@0.0.1

### Initial version

Reimplemented the structure of [lucia v3](https://github.com/lucia-auth/lucia/tree/v3) with the functionality of [Inactivity timeout sessions](https://lucia-auth.com/sessions/inactivity-timeout) plus few personal preferences.
