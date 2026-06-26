# Pi Agent Web - Development Notes

## Quick Start

```bash
npm run dev   # port 30141
```

Typecheck: `node_modules/.bin/tsc --noEmit`  
Lint: `npm run lint`  
**Never run `next build` during dev** — pollutes `.next/` and breaks `npm run dev`.

---

## Architecture

```
Browser                Next.js Server              AgentSession (in-process)
  │                        │                               │
  ├─ GET /api/sessions ────▶ reads ~/.pi/agent/sessions/   │
  ├─ GET /api/sessions/[id] reads .jsonl file directly     │
  │                        │                               │
  ├─ send message ─────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE connect ──────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

**Session browsing** (read-only): reads `.jsonl` files directly via `lib/session-reader.ts` — no AgentSession created.  
**Sending a message**: `startRpcSession()` in `lib/rpc-manager.ts` creates an AgentSession in-process.

---

## File Map

```
app/api/
  sessions/route.ts               GET  list all sessions
  sessions/[id]/route.ts          GET/PATCH/DELETE session
  sessions/[id]/context/route.ts  GET ?leafId= — context for a specific leaf
  agent/new/route.ts              POST { cwd, message, toolNames?, provider?, modelId? }
  agent/[id]/route.ts             GET state | POST any command
  agent/[id]/events/route.ts      GET SSE stream
  files/[...path]/route.ts        GET file contents for viewer
  models/route.ts                 GET { models, modelList, defaultModel }
  models-config/route.ts          GET/POST — read/write ~/.pi/agent/models.json
  skills/route.ts                 GET/PATCH — list/toggle skills
  skills/search/route.ts          POST — search skills.sh
  skills/install/route.ts         POST — install skill package
  auth/providers/route.ts         GET — OAuth providers
  auth/login/[id]/route.ts        GET SSE / POST — OAuth login flow
  auth/logout/[id]/route.ts       POST — disconnect OAuth
  auth/api-key/[id]/route.ts      POST/DELETE — API key management
  models-config/test/route.ts     POST — test model connection

lib/
  rpc-manager.ts      AgentSessionWrapper + registry + startRpcSession
  session-reader.ts   parse .jsonl; getModelNameMap/getModelList/getDefaultModel
  types.ts            shared TypeScript types
  normalize.ts        normalizeToolCalls() — field name mismatch between file format and our types
  system-prompt-off.ts  minimal system prompt when all tools are disabled

components/
  layout/             AppShell, TabBar, FileViewer, ErrorBoundary
  chat/               ChatWindow, ChatInput, MessageView, BranchNavigator, ChatMinimap, MarkdownBody
  sidebar/            SessionSidebar, FileExplorer, FileIcons
  modals/             ModelsConfig, SkillsConfig, ToolPanel
    models-config-types.ts    — interfaces, types, constants
    models-config-forms.tsx   — Field, TextInput, SecretTextInput, NumInput, Select, Check, SectionTitle
    ProviderIcon.tsx          — provider icon with fallback initials
    OAuthDetail.tsx           — OAuth login flow UI
    ApiKeyDetail.tsx          — API key management UI
    AddProviderPicker.tsx     — add provider search/dialog
    skills-config-types.ts    — Skill interface, shortenPath, sourceLabel
    SkillDetail.tsx           — skill detail view + toggle
    AddSkillPanel.tsx         — search & install skills
```

---

## Key Design Decisions & Traps

### AgentSession lifecycle (`lib/rpc-manager.ts`)
- One `AgentSessionWrapper` per session id, keyed in `globalThis.__piSessions`
- `globalThis` survives Next.js hot-reload; plain module-level Map does not
- Idle timeout: 10 minutes. Concurrent `startRpcSession()` calls share a single start Promise (`globalThis.__piStartLocks`)

### Fork must destroy the wrapper immediately
`AgentSession.fork()` **mutates the wrapper's inner state in-place** — after fork, `inner.sessionId` is the *new* session's id. If the wrapper stays alive in the registry under the old id, the next request gets the already-forked state and subsequent forks produce a corrupt `parentSession` chain.

**Fix**: `send("fork")` captures `newSessionId`, then calls `this.destroy()` before returning. The next request for the original session reloads a clean AgentSession from the original file.

### Two kinds of branching — don't confuse them
- **Fork** (Fork button on user message): creates a new independent `.jsonl` file. Shown as a child in the sidebar tree via `parentSession` header field.
- **In-session branch** (Continue button / BranchNavigator): calls `navigate_tree` within the same file. Multiple entries share the same `parentId`. Switching between them calls `/api/sessions/[id]/context?leafId=`.

### Session files can be fully rewritten
`parentSession` in the header is **display metadata only** — has zero effect on chat content. Safe to `writeFileSync` the entire file (pi does this itself during migrations). Used when cascade-reparenting children on delete.

### ToolCall field normalization
Pi stores toolCall blocks as `{type:"toolCall", id, name, arguments}` but `ToolCallContent` uses `{toolCallId, toolName, input}`. `normalizeToolCalls()` in `lib/normalize.ts` handles this — called in both `session-reader.ts` (file load) and `ChatWindow.handleAgentEvent()` (streaming).

### New session tool preset
Tool names are passed at session creation (`POST /api/agent/new` → `toolNames[]`). For existing sessions, the active preset is inferred on mount via `get_tools` → `getPresetFromTools()`. When tools are fully disabled (`toolNames = []`), `rpc-manager.ts` injects a minimal system prompt via `system-prompt-off.ts` + `DefaultResourceLoader`.

### Model defaults for new sessions
`GET /api/models` returns `defaultModel` read from `~/.pi/agent/settings.json`. `ChatWindow` pre-selects this on mount for new sessions.

### SSE reconnect on page refresh mid-stream
On `ChatWindow` mount, `GET /api/agent/[id]` is called. If `state.isStreaming === true`, SSE is reconnected automatically. `thinkingLevel` and `isCompacting` are also synced from this response.

### Compaction SSE events
Newer pi emits `compaction_start` / `compaction_end`; older versions emitted `auto_compaction_start` / `auto_compaction_end`. `handleAgentEvent` accepts both sets to keep `isCompacting` in sync. Manual compact is a blocking POST — the button stays disabled until the response returns.

### Orphaned sessions
Sessions whose first line can't be parsed as a valid header are marked `orphaned: true` in the API response — displayed with an "incomplete" badge in the sidebar and not clickable.

### CSS Design Tokens (`app/globals.css`)
Semantic color system with light/dark mode variants. All components use CSS variables — never hardcoded hex/rgba.
Categories: base (bg/text/border), semantic (error/success/warning/info), overlay, accent-tints, shadows, typography (font sizes), radius.

---

## Pi Session File Format

Location: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"...","cwd":"/path","parentSession":"/abs/path/to/parent.jsonl"}
{"type":"model_change","id":"<8hex>","parentId":null,"provider":"zenmux","modelId":"claude-sonnet-4-6","timestamp":"..."}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"user","content":"..."}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"assistant","content":[...],...}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"toolResult","toolCallId":"...","content":[...]}}
{"type":"compaction","id":"<8hex>","parentId":"<8hex>","summary":"...","firstKeptEntryId":"<8hex>","tokensBefore":N}
{"type":"session_info","id":"...","parentId":"...","name":"user-defined name"}
```

`entryIds[]` in `SessionContext` is a parallel array to `messages[]` — maps each displayed message back to its `.jsonl` entry id, used for fork and navigate_tree calls.
