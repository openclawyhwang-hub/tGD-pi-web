# Pi with tGD — Web Interface

[繁體中文](./README.zh-TW.md)

A web interface for [Pi Coding Agent](https://github.com/earendil-works/pi). Browse conversations, chat with the agent in real time, fork threads, and switch between message branches — all in the browser.

## Quick Start

**One-command install:**

```bash
git clone https://github.com/openclawyhwang-hub/tGD-pi-web.git
cd tGD-pi-web
./setup.sh
```

`setup.sh` checks Node.js version, installs dependencies, verifies the build, and asks whether to start the dev server.

**Manual install:**

```bash
git clone https://github.com/openclawyhwang-hub/tGD-pi-web.git
cd tGD-pi-web
npm install
npm run dev
```

Open [http://localhost:30141](http://localhost:30141) after startup.

**Custom port:**

```bash
npm run dev -- --port 8080               # via CLI flag
PORT=8080 npm run dev                    # via env var
```

## Features

### Chat
- **Live streaming** — SSE streaming, tokens appear as they're generated
- **Steer / Follow-up** — Interrupt a running agent, or append a message after completion
- **Model switching** — Change model and thinking level mid-conversation
- **Tool panel** — Control which tools the agent can use (none / preset / all)
- **Compact session** — Summarize long threads to save context window

### Session Management
- **Session browser** — Grouped by working directory, auto-detects recent projects
- **Time grouping** — Today / Yesterday / This Week / Earlier
- **Search** — Instant filter by session name or first message
- **Auto-naming** — Generates a title after the first exchange
- **Fork** — Branch off from any user message into an independent new session
- **In-session branches** — Roll back to any node and continue; branches share one file
- **Branch navigator** — Visual switching between branches within a session
- **Export HTML** — Save a session as a standalone HTML file

### File Browsing
- **File explorer** — In-sidebar file tree with expand/collapse
- **File search** — Instant filter; matched directories auto-expand
- **Junk filtering** — Hides `.git`, `node_modules`, `__pycache__`, etc.
- **File preview** — View file contents in a tab; Markdown rendered
- **@-mention** — Click the button next to a file to insert its path into chat

### Rendering
- **Markdown** — GFM syntax, tables, task lists
- **Code** — Syntax highlighting + line numbers
- **Math** — KaTeX for inline and block formulas
- **Diagrams** — Mermaid flowcharts, sequence diagrams, etc.
- **Provider icons** — Anthropic, OpenAI, Google, ZAI, etc.

### Experience
- **Dark mode** — Auto-detects system theme; manual toggle has a circular reveal animation
- **Cross-platform fonts** — Bundled Inter + JetBrains Mono, zero network dependency
- **Accessibility** — Keyboard focus indicators, respects `prefers-reduced-motion`, ARIA labels
- **Responsive** — Adapts to desktop and touch devices (scrollbars, layout)
- **IME support** — Correctly handles CJK input method composition

### tGD Integration
- **Slash commands** — Run `/tgd-map`, `/tgd-define`, etc. (7-phase commands) directly in the web UI
- **Skills management** — Search and install tGD skills

## Configuration

| Item | Description |
|------|-------------|
| Session directory | Defaults to `~/.pi/agent/sessions/`; set `PI_CODING_AGENT_DIR` to override |
| Model config | Reads `models.json`; editable via the Models panel in the sidebar |
| API keys | Per-provider keys stored in `auth.json` |
| Default directory | Set or customize via the CWD picker |

## Development

```bash
npm install
npm run dev    # port 30141
```

**Verification commands:**

```bash
node_modules/.bin/tsc --noEmit     # Typecheck
npx eslint .                       # Lint
```

> ⚠️ **Never** run `next build` during development — it pollutes `.next/` and breaks `npm run dev`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + CSS Variables (zero CSS-in-JS) |
| Agent SDK | @earendil-works/pi-ai + pi-coding-agent |
| Markdown | react-markdown + remark-gfm + rehype-katex |
| Diagrams | Mermaid |
| Code | react-syntax-highlighter |
| Fonts | Inter + JetBrains Mono (bundled .woff2) |

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

## Project Structure

```
app/
  api/
    agent/          # send commands, SSE event stream, auto-naming
    sessions/       # read/write session files, export
    files/          # file content read (stream, meta, preview, watch)
    models/         # available models + default model
    models-config/  # read/write models.json
    auth/           # provider login/logout
    skills/         # tGD skills search & install
    cwd/            # working directory validation
components/         # UI components
lib/
  rpc-manager.ts    # AgentSession lifecycle management
  session-reader.ts # parse .jsonl session files
  file-security.ts  # path validation + allowed roots
  file-mime.ts      # extension → MIME/language mapping
  file-stream.ts    # streaming, Content-Disposition, HTML preview
  normalize.ts      # normalize toolCall field names
  types.ts          # shared TypeScript types
hooks/              # extracted state logic (useSessions, useCwd, useFileWatch, …)
```

## License

MIT
