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

await nyx.session.invalidate(sessionId);
await nyx.session.invalidateAll(userId);
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
| `findSessionById(sessionId)`                             | `DatabaseSession` or `null` or `AdapterError`         |
| `updateSessionbyId(sessionId, session)`                  | `undefined` or `AdapterError`                         |
| `deleteSessionById(sessionId)`                           | `undefined` or `AdapterError`                         |
| `deleteSessionsByUserId(userId)`                         | `undefined` or `AdapterError`                         |
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
| `session.mapSessionAttributes`  | `(db) => SessionAttrs` | identity              |
| `user.createId`                 | `() => string`         | `crypto.randomUUID()` |
| `user.mapUserAttributes`        | `(db) => UserAttrs`    | identity              |

### `nyx.session`

| Method                                    | Returns                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `create(userId, attributes)`              | `{ token, value }` or `UnexpectedError`            |
| `get(id)`                                 | `Session` or `null` or `UnexpectedError`           |
| `validateToken(token)`                    | `{ session, user }` or `null` or `UnexpectedError` |
| `invalidate(id)`                          | `undefined` or `UnexpectedError`                   |
| `invalidateAll(userId)`                   | `undefined` or `UnexpectedError`                   |
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
