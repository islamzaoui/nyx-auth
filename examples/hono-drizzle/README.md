# hono + drizzle example

A complete email/password authentication example built with [Nyx Auth](https://github.com/anomalyco/nyx-auth), [Hono](https://hono.dev), and [drizzle](https://orm.drizzle.team).

It demonstrates a full-stack TypeScript workflow: password hashing with Bun, session management via cookie-based tokens, per-user todos, structured logging, Zod validation, and auto-generated OpenAPI docs rendered with Scalar.

## Features

- **Email/password authentication** — register, login, logout with `Bun.password` hashing
- **Cookie sessions** — httpOnly `auth` cookie backed by `nyx.session`
- **Authenticated todos** — per-user CRUD scoped to the current session
- **Zod validation** — `@hono/zod-validator` with a shared validation helper
- **Structure logging** — `hono-pino` + `pino`, request-scoped logger
- **OpenAPI docs** — auto-generated `openapi.json` served through [Scalar](https://github.com/scalar/scalar)
- **In-memory SQLite** — schema pushed via `drizzle-kit/api`, no config needed

## Quick start

Requires [Bun](https://bun.sh).

```sh
bun install
bun dev
```

The app runs at `http://localhost:3000` — open it to view the rendered OpenAPI docs in the Scalar UI.

## Project structure

```
src/
├── index.ts              # App entry — middleware, Scalar docs, route mounting
├── lib/
│   ├── auth/
│   │   ├── nyx.ts        # Nyx instance + DrizzleAdapter setup
│   │   └── cookie.ts     # auth cookie get/set/delete helpers
│   ├── db/
│   │   ├── index.ts      # libsql client + schema push
│   │   └── schema.ts     # users, sessions, todos tables
│   ├── error.ts          # Tagged DatabaseError with toResponse()
│   └── factory.ts        # base/user Hono factories with typed context
├── middlewares/
│   ├── auth.ts           # Validates the session token and populates context
│   ├── require-auth.ts   # Guards routes for authenticated users
│   └── validator.ts      # Typed Zod validator wrapper
├── repositories/
│   ├── user.ts           # DB access for users
│   └── todo.ts           # DB access for todos
├── routes/
│   ├── index.route.ts    # Mounts /auth, /users, /todos
│   ├── auth.route.ts     # register / login / logout
│   ├── todos.route.ts    # Todos CRUD
│   └── users/
│       ├── index.route.ts
│       └── me.route.ts   # GET /users/me
└── schemas/
    ├── auth.schema.ts    # Login / Register Zod schemas
    └── todo.schema.ts    # Create / Update todo Zod schemas
```

## How authentication works

1. `auth` middleware reads the `auth` cookie and calls `nyx.session.validateToken`.
2. If valid, the resolved `session` and `user` are set on the Hono context.
3. `requireAuth` rejects requests with no authenticated user (`401`).
4. Route factories expose the authenticated context as `c.var.user` / `c.var.session`.

Login and register responses set an `httpOnly` cookie, so authenticated clients only need to send the cookie back.

## API

| Method | Path             | Auth | Description                    |
| ------ | ---------------- | ---- | ------------------------------ |
| POST   | `/auth/register` |      | Register and create a session  |
| POST   | `/auth/login`    |      | Login and create a session     |
| POST   | `/auth/logout`   | yes  | Invalidate and clear session   |
| GET    | `/users/me`      | yes  | Get the current user           |
| GET    | `/todos`         | yes  | List the user's todos          |
| POST   | `/todos`         | yes  | Create a todo                  |
| GET    | `/todos/:id`     | yes  | Get a todo                     |
| PATCH  | `/todos/:id`     | yes  | Update a todo                  |
| DELETE | `/todos/:id`     | yes  | Delete a todo                  |

## Regenerating OpenAPI docs

The `generated/openapi.json` file is produced from the route types by [@rcmade/hono-docs](https://github.com/rcmade/hono-docs):

```sh
bun run docs
```

## Scripts

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `bun dev`           | Start the dev server with watch mode          |
| `bun run typecheck` | Typecheck the project with `tsc --noEmit`     |
| `bun run docs`      | Regenerate `generated/openapi.json`           |