# Project Configuration

- **Language**: TypeScript
- **Package Manager**: Bun v1.3.13
- **Monorepo Tool**: Turborepo
- **Versioning**: Tegami
- **Linting**: Biome

---

## Writing changelog files

This repo uses [Tegami](https://tegami.fuma-nama.dev/llms.txt) for versioning. Your job here is only to write changelog files — nothing else about the release/publish flow.

Run `bun tegami` to create one (or write manually). Files go under `.tegami/` as `YYYY-MM-DD-{hash}.md`. See the [changelog format docs](https://tegami.fuma-nama.dev/changelog.md) for full details.

### Avoid duplicated entries

Never list multiple packages in one file:

```md
---
packages: ["npm:@nyx-auth/core", "npm:@nyx-auth/drizzle-adapter"]
---
```

This duplicates the same entry text into both changelogs. Instead, if a change spans multiple packages, write **separate files**, each describing that package's own side of the change:

```md
---
packages:
  "npm:@nyx-auth/core": minor
---

## Add `updateSessionAttributes` method

- Added `updateSessionAttributes(sessionId, attributes)` to `Nyx`
```

```md
---
packages:
  "npm:@nyx-auth/drizzle-adapter": minor
---

## Support partial attribute updates

- Updated `updateSessionbyId` to merge partial attributes for the new core API
```

Use the Package ID form (`"npm:@nyx-auth/core"`) — avoid plain names or `group:` refs, since both can pull in more than one package and reintroduce the duplication problem.

### Bump type via heading

| Heading | Bump |
|---|---|
| `#` | major |
| `##` | minor |
| `###` | patch |

### Entry style

`##`/`###` heading + past-tense bullet list:

```md
---
packages:
  "npm:@nyx-auth/core": minor
---

## Namespaced API & user management

- Reorganized core into namespaced `nyx.session.*` and `nyx.user.*` APIs
- Added `updateSessionAttributes(sessionId, attributes)` method
- Fixed `UnexpectedError` constructor to accept cause directly
```

Verbs: `Added` (feature), `Fixed` (bug), `Reorganized`/`Renamed` (refactor), `Removed`, `Updated` (docs).

### Rules

- Frontmatter `packages` lists exactly **one** package — never multiple
- At least one heading in the body
- Never edit `.tegami/publish-lock.yaml` or package `CHANGELOG.md` files directly
