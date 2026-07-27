---
packages:
  "npm:@nyx-auth/core": minor
---

## Namespaced API & user management

- Reorganized core into namespaced `nyx.session.*` and `nyx.user.*` APIs
- Added user management (`create`, `get`, `updateAttributes`, `delete`)
- Added `DatabaseUser` interface to adapter contract
- Added `findSessionWithUserById` to adapter interface
- `validateToken` now returns `{ session, user }` combined object
- Extracted `UnexpectedError` into dedicated module with direct `cause` constructor
- Extracted crypto utilities (`generateSessionId`, `hashSecret`, `constantTimeEqual`) into `utils/crypto.ts`
- Renamed `$inferSession` to `nyx.session.$infer` and added `nyx.user.$infer`
- Expanded README with full API reference, error handling, and custom adapter guide
