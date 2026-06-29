# Changelog

All notable changes to tGD-pi-web are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: `YYYY.MM.DD` (date-based, aligned with upstream tGD).

## [Unreleased]

---

## [2026.06.30] — bf0eea29

### Added
- **Session pin/unpin**: new REST endpoint `GET/POST/DELETE /api/sessions/pins` persists to `~/.pi/agent/pins.json`. Pinned sessions float to the top of the sidebar under a "Pinned" group header; unpinned sessions keep the existing tree layout with date group headers. Third sidebar action button (pin → rename → delete order, with delete still last since it's destructive). Pinned state is shown via a filled star in a neutral tone (not the warning yellow — shape, not color, signals the toggle).
- **Section dividers**: 1px `border-top` between Pinned and date groups; the first section has no divider so the layout doesn't start with a stray line.
- **`ChatInput.setText()`**: imperative API that forcefully replaces the input value. Quick-action phase chips use it so clicking a different phase swaps the slash command rather than appending.

### Changed
- **Slash command descriptions** are now uniform English em-dash format. The last command is renamed `/tgd-ship` → `/tgd-release` (the `/^/tgd-(\w+)(.*)$/` regex generalises to it automatically).
- **Brand mark unification**: "π with tGD" rendered consistently across all three sites (browser tab, ChatWindow welcome, AppShell welcome, sidebar PiAgentTitle). "π" is 28px / 700, "with tGD" is 22px / 700, baseline-aligned via flex+gap. The text "Pi" is gone from the visible UI; the Greek letter is the mark now.
- **PiAgentTitle simplified**: removed the click-to-scramble animation and click-to-show-version. The component is now a static 19-line span (was 91 lines).
- **Typography consistency**: removed `var(--font-mono)` from non-code UI chrome (ChatWindow welcome header, CwdPicker paths / items / custom-path input). Added `PingFang TC` and `Microsoft JhengHei` to the font-family fallback chain so Traditional Chinese renders correctly on macOS / Windows.

### Verified
- TypeScript: `tsc --noEmit` — 0 errors
- ESLint: 0 errors (12 pre-existing unused-import warnings, unrelated)
- Server: `http://localhost:30141` HTTP 200
- API smoke: pin/rename/delete all idempotent (GET empty, POST new, POST existing → no-op, DELETE existing, DELETE missing → no-op, POST missing id → 400), `pins.json` written to disk

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
