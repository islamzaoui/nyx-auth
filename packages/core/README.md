# @nyx-auth/core

> [!IMPORTANT]  
> Nyx currently is just a reimplementation of [lucia](https://github.com/lucia-auth/lucia/tree/v3) with a few personal modifications. The API is not stable and may change in the future. Use at your own risk.

The core library for nyx-auth. Provides session management and user management via a namespaced API.

## Installation

```bash
bun add @nyx-auth/core
```

## Usage

### Create instance & Infer types

```ts
import { Nyx, UnexpectedError } from "@nyx-auth/core";
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter"; // or any other adapter

const nyx = new Nyx({
    adapter: DrizzleAdapter.sqlite({ db, tables: { sessions, users } }),
    session: {
        mapSessionAttributes: (attributes) => ({ ipAddress: attributes.ipAddress }),
    },
    user: {
        mapUserAttributes: ({ passwordHash, ...attributes }) => attributes,
    },
});

// Type inference
type Session = typeof nyx.session.$infer;
type User = typeof nyx.user.$infer;
```

### Session management

```ts
const sessionResult = await nyx.session.create(userId, { ipAddress: "..." });
if (sessionResult instanceof UnexpectedError) {
    // handle error
}
const { token, value: session } = sessionResult;

const validated = await nyx.session.validateToken(token);
if (validated instanceof UnexpectedError) {
    // handle error
}
if (validated) {
    const { session, user } = validated;
}

const deleted = await nyx.session.invalidate(sessionId); // false if no session matched
await nyx.session.invalidateAll(userId); // false if the user had no sessions
await nyx.session.updateAttributes(sessionId, { ipAddress: "..." });
```

### User management

```ts
const user = await nyx.user.create({ email, passwordHash });
if (user instanceof UnexpectedError) {
    // handle error
}

const existingUser = await nyx.user.get(userId);
if (existingUser instanceof UnexpectedError) {
    // handle error
}
await nyx.user.updateAttributes(userId, { email: "new@example.com" });
await nyx.user.delete(userId);
```

> [!IMPORTANT]
> `mapUserAttributes` and `mapSessionAttributes` are **required**. They map
> the raw user/session table columns (except reserved ones) to what your app
> receives from `validateToken()` and `user.get()`. Without them, every column
> — including `passwordHash`, TOTP secrets, or OAuth provider tokens — would
> be returned to your application and could leak to any client you serialize
> the user object to. Only map the fields your app needs.

## TimeSpan

A helper for specifying time durations in configuration options.

```ts
import { TimeSpan } from "@nyx-auth/core";

const span = new TimeSpan(30, "m");             // 30 minutes
const span = new TimeSpan(7, "d");              // 7 days
```

| Unit | TimeSpanUnit |
| ---- | ------------ |
| `ms` | milliseconds |
| `s`  | seconds      |
| `m`  | minutes      |
| `h`  | hours        |
| `d`  | days         |
| `w`  | weeks        |

**Methods:**

| Method                                      | Returns   |
| ------------------------------------------- | --------- |
| `milliseconds()`                            | `number`  |
| `seconds()`                                 | `number`  |
| `toDate()`                                  | `Date`    |
| `elapsedSince(from: Date, now: Date)`       | `boolean` |

## Error handling

Every method returns errors as return values (not thrown exceptions). Check the result type to handle failures.

```ts
import { UnexpectedError } from "@nyx-auth/core";

const result = await nyx.session.create(userId, { ipAddress });

if (result instanceof UnexpectedError) {
    // The underlying cause is available via result.cause
}
```

## Custom adapters

Implement the `Adapter` interface to support any database or storage backend.

```ts
import {
    type Adapter,
    type Attributes,
    type DatabaseSession,
    type DatabaseUser,
    AdapterError,
} from "@nyx-auth/core";
```

### `Adapter`

| Method                                                   | Returns                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `insertSession(session)`                                 | `DatabaseSession` or `AdapterError`                   |
| `updateSessionbyId(sessionId, session)`                  | `undefined` or `AdapterError`                         |
| `deleteSessionById(sessionId)`                           | `boolean` (deleted?) or `AdapterError`                |
| `deleteSessionsByUserId(userId)`                         | `boolean` (deleted?) or `AdapterError`                |
| `insertUser(user)`                                       | `DatabaseUser` or `AdapterError`                      |
| `findUserById(userId)`                                   | `DatabaseUser` or `null` or `AdapterError`            |
| `updateUserbyId(userId, user)`                           | `undefined` or `AdapterError`                         |
| `deleteUserById(userId)`                                 | `undefined` or `AdapterError`                         |
| `findSessionWithUserById(sessionId)`                     | `{ session, user }` or `null` or `AdapterError`       |

### Type reference

```ts
// Shape of a raw session row from the database
interface DatabaseSession<A = object> {
    id: string;
    userId: string;
    secretHash: Uint8Array;
    createdAt: Date;
    lastVerifiedAt: Date;
    attributes: A;
}

// Shape of a raw user row from the database
interface DatabaseUser<A = object> {
    id: string;
    attributes: A;
}

// Defines the select and insert attribute shapes separately
type Attributes<Select, Insert> = {
    select: Select;
    insert: Insert;
};
```

`AdapterError` wraps failures with an `operation` name and the underlying `cause`.

## API

### `new Nyx(options)`

| Option                          | Type                   | Default               |
| ------------------------------- | ---------------------- | --------------------- |
| `adapter`                       | `Adapter`              | (required)            |
| `session.inactivityTimeout`     | `TimeSpan`             | `10 days`             |
| `session.activityCheckInterval` | `TimeSpan`             | `1 hour`              |
| `session.mapSessionAttributes`  | `(db) => SessionAttrs` | (required)            |
| `user.createId`                 | `() => string`         | `crypto.randomUUID()` |
| `user.mapUserAttributes`        | `(db) => UserAttrs`    | (required)            |

### `nyx.session`

| Method                                    | Returns                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `create(userId, attributes)`              | `{ token, value }` or `UnexpectedError`            |
| `validateToken(token)`                    | `{ session, user }` or `null` or `UnexpectedError` |
| `invalidate(id)`                          | `boolean` (deleted?) or `UnexpectedError`          |
| `invalidateAll(userId)`                   | `boolean` (deleted?) or `UnexpectedError`          |
| `updateAttributes(sessionId, attributes)` | `undefined` or `UnexpectedError`                   |
| `$infer`                                  | `Session<SessionAttrs>`                            |

### `nyx.user`

| Method                                        | Returns                                    |
| --------------------------------------------- | ------------------------------------------ |
| `create(attributes)`                          | `User` or `UnexpectedError`                |
| `get(id)`                                     | `User` or `null` or `UnexpectedError`      |
| `updateAttributes(id, attributes)`            | `undefined` or `UnexpectedError`           |
| `delete(id)`                                  | `undefined` or `UnexpectedError`           |
| `$infer`                                      | `User<UserAttrs>`                          |

## Security guidance

- **Only `validateToken` authorizes.** Session IDs are not secrets — never
  gate access with anything else.
- **Store the token in an `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`)
  cookie** and never in `localStorage`, URLs, or logs. Read the token from the
  cookie on each request, validate it, and set a new cookie when the session
  is refreshed.
- **Invalidate sessions on credential changes.** Call `invalidateAll(userId)`
  when a user changes their password, email, or when you suspect compromise.
  Also call it on privilege escalation if you want to force re-authentication.
- **Mappers are required.** The attribute mappers define exactly what your
  app sees — only map the fields your app needs, and keep `passwordHash`,
  TOTP secrets, provider tokens, etc. out of the mapped shape.
- **Delete the user's sessions when deleting a user.** `validateToken` fails
  closed for orphaned sessions (the join finds no user), but add
  `ON DELETE CASCADE` to the sessions table so rows don't accumulate.
- **Don't serialize `UnexpectedError.cause` to clients.** It can contain
  database internals (driver errors, query details).
- **Validate session tokens server-side on every request** — the token is the
  only credential; there is no client-side state to trust.
- `session.inactivityTimeout` and `session.activityCheckInterval` must both be
  greater than zero, and the check interval must be smaller than the timeout.
  Invalid configurations throw at construction time.
