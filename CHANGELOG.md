# Changelog

All notable changes to tGD-pi-web are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: `YYYY.MM.DD` (date-based, aligned with upstream tGD).

## [Unreleased]

### Changed
- Replaced `any` with typed `unknown` helpers in `lib/__tests__/normalize.test.ts` (10 lint errors fixed).
- Added `npm run analyze` script (`@next/bundle-analyzer` was already configured in `next.config.ts` via `ANALYZE=true`).

### Verified
- TypeScript: `tsc --noEmit` — 0 errors
- ESLint: 0 errors (12 pre-existing unused-import warnings, unrelated)
- Vitest: 34/34 pass (`normalize`, `file-paths`, `session-reader`)
- Next.js production build (`next build --webpack`): ✓ 7.7s compile, 9 static pages, 23 API routes
- Bundle analyzer: 3 reports generated (`client.html` 766K, `nodejs.html` 883K, `edge.html` 268K)

### Known Bundle Bloat (investigate next)
| Chunk | Size | Source |
|---|---:|---|
| `da12927c.00775c0e4542fd3e.js` | 1288.9 KB | **mermaid** diagram types — require custom mermaid build to split |
| `90542734.b75ad0df50bf68f5.js` | 1246.9 KB | **mermaid** diagram variants |
| `4bd1b696` | 598.5 KB | react-markdown + micromark (rootMainFiles) |
| `0d8bff65` / `628fdacb` | 587.1 KB | mermaid diagram layouts (block, c4, sequence) |
| `framework-594babcea68f40f6.js` | 523.5 KB | React + Next runtime (baseline, can't reduce) |
| `d2c09beb` | 300.0 KB | mermaid layout |
| `28f0fb3b` | 260.6 KB | mermaid |

**Estimated savings**: mermaid is now dynamic-imported but its **internal** diagram types (block, c4, sequence, etc.) are bundled eagerly. Replacing `import("mermaid")` with `import("mermaid/dist/mermaid.esm.min.mjs")` or building a custom mermaid build with only the diagram types actually used could shave ~2.4 MB from the mermaid chunk.

---

## [2026.06.28-2] — 621efa86 / TBD

### Changed
- **Lazy-load math plugins**: `remark-math` + `rehype-katex` are no longer in the initial bundle. `MarkdownBody` scans the markdown source with a `containsMath()` heuristic and dynamically imports both plugins only when `$...$` or `$$...$$` is detected. Falls back to plain rendering if plugin load fails.
- `katex/dist/katex.min.css` remains globally imported via `app/layout.tsx` (CSS payload is small, and KaTeX styles must be available before math renders).
- Added `npm run analyze` script.

### Verified (before)
- TypeScript: `tsc --noEmit` — 0 errors
- ESLint: 0 errors (12 pre-existing warnings)
- Vitest: 34/34 pass
- `next build --webpack`: ✓ 7.7s compile, 9 static pages, 23 API routes

### Bundle impact (client)
- Before lazy fix: katex / rehype-katex = **601 KB** in client
- After lazy fix: katex / rehype-katex = **0 KB** in client (now loaded only on demand)
- The 587 KB katex chunk still appears in `nodejs.html` (server-side rendering of math is unaffected)

### Code health
- `MathPlugins` type alias local to `MarkdownBody.tsx` (`{ remarkMath, rehypeKatex }`).
- `PluggableList` imported from `unified` for accurate react-markdown plugin prop typing.
- New `containsMath()` helper is regex-based and conservative (matches `$$...$$` block + `$...$` inline, avoiding `\$` escapes).

---

## [2026.06.28] — 21d61571

### Changed
- **Refactor (Batch 1 + 2)**: moved 50+ component inline `style={{}}` blocks into CSS Modules. ~4500 LOC net change across `chat/`, `layout/`, `modals/`, `sidebar/`.
- Replaced favicon with custom `app/icon.svg` (dark space + blue-purple gradient).
- AppShell: `onMouseEnter/Leave` → CSS `:hover` / `group-hover` (5 batches).

### Notes
- Semantic CSS tokens are the single source of color truth. Components contain 0 hardcoded hex/rgba.
- Tests now cover `normalize`, `file-paths`, and `session-reader` (Vitest).

---

## [2026.06.27] — bc6df39b

### Added
- Vitest test suite (3 files, 34 cases).
- `release.sh` script for date-based versioning.
- CSS hover utilities (replacing JS hover handlers).
- Bundle analyzer integration (was already configured, now exercised).

### Changed
- `ModelsConfig.tsx` split from 1639 → 803 LOC into 7 files.
- `SkillsConfig.tsx` split + modal lazy loading.
- Component directory restructured (`chat/` / `sidebar/` / `modals/` / `layout/`).
- `AGENTS.md` written for codebase onboarding.

### Fixed
- Magic color cleanup (all `hex` literals replaced with CSS tokens).
- Touch target sizes standardized (mobile).
- Send button feedback (loading + disabled states).

### Security
- ToolCall field normalization hardened (`lib/normalize.ts`).
- Error boundary added to root layout.
