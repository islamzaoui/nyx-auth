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
