# @nyx-auth/core

> [!IMPORTANT]  
> Nyx currently is just a reimplementation of [lucia](https://github.com/lucia-auth/lucia/tree/v3) with a few personal modifications. The API is not stable and may change in the future. Use at your own risk.

The core library for nyx-auth. Provides the essential session management functionality

## Usage

```ts
import { Nyx } from "@nyx-auth/core";

const nyx = new Nyx(new Adapter(db));

const session = await nyx.createSession(userId, {});
await nyx.validateSession(session.id);
```

## Installation

```bash
bun add @nyx-auth/core
```