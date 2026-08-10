---
packages:
  "npm:@nyx-auth/drizzle-adapter": patch
---

### Fixed attribute nullability inference

- Fixed `select` attribute inference to use the table's `$inferSelect`, so nullable columns resolve to `T | null` instead of `T`
- Replaced hand-rolled `insert` attribute inference with the table's `$inferInsert`, preserving required vs optional fields (including columns with defaults or `$default` runtime defaults)