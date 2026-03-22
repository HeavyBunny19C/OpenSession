<p align="center">
  <img src="./docs/preview-dashboard.png" alt="oh-my-opensession" width="720" />
</p>

<h1 align="center">OpenSession</h1>

<p align="center">
  <strong>The Developer's AI Chronicle — binding your scattered conversation diaries into one volume</strong>
</p>

<p align="center">
  <a href="./README.en.md">English</a> · <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/dependencies-0-blue?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/v1.2.0-orange?style=flat-square" alt="Version" />
</p>

<p align="center">
  <em>Developers keep journals too — ours just happen to be AI conversations.</em><br/>
  <em>The problem? Your journal is scattered across four different drawers.</em>
</p>

---

## 🤔 What Is This?

We might be the first generation of programmers who **talk to AI more than to our coworkers**.

Think about it — every day you pour your most complex architecture decisions, your trickiest debugging logic, your most inspired design instincts into conversations with AI. These conversations are more honest than any code comment you've ever written (let's be real, you'd never put "I can't understand my own code from three days ago" in a comment), more informative than any standup, and closer to your actual work than any weekly report.

**Your AI conversation history is the most authentic developer journal of this era.**

Except this journal is scattered across four different notebooks — OpenCode's SQLite database, Claude Code's JSONL files, Codex's JSON, Gemini's temp directory. Four formats, four corners, much like that "read later" bookmark folder you'll never actually organize.

**OpenSession does one simple thing: gathers those four scattered diaries and binds them into one volume.**

Search, browse, star, export, stats — dark mode, terminal aesthetic, zero dependencies. It'll even tell you exactly how many tokens you've burned (you might want to sit down before looking at that number 💸).

---

## 🤖 Supported AI Tools

| Tool | Status | Capabilities |
|:---|:---:|:---|
| **OpenCode** | ✅ Full | Browse, search, star, rename, delete, export, trace |
| **Claude Code** | 📖 Read-only | Browse, search, token stats |
| **Codex CLI** | 📖 Read-only | Browse, search, token stats |
| **Gemini CLI** | 📖 Read-only | Browse, search, token stats |

> Smart path detection: probes env vars, XDG, dotfiles, macOS ~/Library, Windows %AppData%. Star/rename/delete/batch/export are OpenCode-only.

---

## 🚀 Quick Start

```bash
npx @heavybunny19c_lee/opensession
```

> 💡 Open `http://localhost:3456` and start exploring your AI coding sessions!

### Global Install

```bash
npm install -g @heavybunny19c_lee/opensession
opensession --open  # auto-opens browser
```

### From Source

```bash
git clone https://github.com/HeavyBunny19C/OpenSession.git
cd OpenSession
npm start
```

---

## 📦 Install / Upgrade / Uninstall

```bash
# Install
npm install -g @heavybunny19c_lee/opensession

# Upgrade to latest
npm update -g @heavybunny19c_lee/opensession

# Uninstall
npm uninstall -g @heavybunny19c_lee/opensession
```

> Backward compatible: the `oh-my-opensession` command still works after upgrade.

---

## ✨ Features

| | Feature | Description |
|:---:|:---|:---|
| 🤖 | **Multi-provider** | One UI for OpenCode, Claude Code, Codex CLI, Gemini CLI |
| 🌙 | **Dark mode** | Auto-follows system, easy on the eyes |
| 🖥️ | **Terminal aesthetic** | Code block cards + grid background |
| 🔍 | **Search & filter** | By keyword, time range, across all providers |
| ⭐ | **Star & rename** | Mark important sessions (OpenCode) |
| 📤 | **Export** | JSON / Markdown (OpenCode) |
| 🗑️ | **Soft delete** | Recoverable trash bin (OpenCode) |
| 📊 | **Token stats** | Daily token usage charts |
| 🔮 | **Trace visualization** | Agent/Skill/MCP/Tool/LSP call chain tree — see how AI thinks |
| 🌐 | **i18n** | English & Chinese |
| 🚀 | **Zero dependencies** | Pure Node.js, no npm install needed |

---

## ⚙️ CLI Options

```
Option                  Description                     Default
--port <port>           Server port                     3456
--opencode-db <path>    OpenCode database path          auto-detect
--claude-dir <path>     Claude Code projects dir        auto-detect
--codex-dir <path>      Codex CLI sessions dir          auto-detect
--gemini-dir <path>     Gemini CLI sessions dir         auto-detect
--lang <en|zh>          UI language                     auto-detect
--open                  Auto-open browser               false
--reindex               Force rebuild session index     false
-h, --help              Show help                       —
```

## 🔧 Environment Variables

| Variable | Description |
|:---|:---|
| `PORT` | Server port (`--port` takes priority) |
| `SESSION_VIEWER_DB_PATH` | OpenCode DB path (`--opencode-db` takes priority) |
| `OH_MY_OPENSESSION_META_PATH` | Metadata DB directory |

---

## 🏗️ Architecture

```
opensession
├── bin/cli.mjs              # Entry point
├── src/
│   ├── server.mjs           # HTTP server, /:provider routing
│   ├── providers/
│   │   ├── interface.mjs    # ProviderAdapter interface (JSDoc)
│   │   ├── index.mjs        # Provider registry
│   │   ├── opencode/        # OpenCode adapter (SQLite)
│   │   ├── claude-code/     # Claude Code adapter (JSONL)
│   │   ├── codex/           # Codex CLI adapter (JSONL)
│   │   └── gemini/          # Gemini CLI adapter (JSON)
│   ├── index-db.mjs         # Cross-provider session index
│   ├── meta.mjs             # User metadata (star, rename, delete)
│   ├── views/               # Server-rendered HTML templates
│   ├── static/              # CSS + client JS
│   └── locales/             # i18n (en, zh)
└── docs/
    └── CONTRIBUTING-PROVIDER.md  # How to add a new provider
```

---

## 🔌 Add Your Own Provider

See [CONTRIBUTING-PROVIDER.md](./docs/CONTRIBUTING-PROVIDER.md) for a step-by-step guide.

---

<details>
<summary>🤖 <strong>AI Agent Context</strong> (click to expand)</summary>

```
PROJECT: OpenSession v1.1.1
PURPOSE: Multi-provider AI session viewer (web UI)
STACK: Node.js ≥22.5.0, zero dependencies, ESM, SQLite (node:sqlite)
PROVIDERS: OpenCode (read-write), Claude Code (read-only), Codex CLI (read-only), Gemini CLI (read-only)

ARCHITECTURE:
  src/providers/interface.mjs — ProviderAdapter interface
  src/providers/*/adapter.mjs — Per-provider implementation
  src/index-db.mjs — Cross-provider session index (SQLite)
  src/meta.mjs — User metadata: star, rename, soft-delete (SQLite)
  src/server.mjs — HTTP routing with /:provider prefix

KEY FACTS:
  - Read-only: Never modifies AI tool databases
  - Meta storage: ~/.config/oh-my-opensession/meta.db
  - Zero install: Clone and run, no npm install needed
  - ESM only: "type": "module", entry is bin/cli.mjs
  - No build step: Pure JavaScript, no bundler
```

</details>

---

## 📋 Changelog

### v1.2.0 — Smart Path Detection & Provider Audit Fixes

**🔍 Smart Path Detection (New)**
- Multi-path probe mechanism — auto-scans env vars, XDG paths, dotfiles, macOS `~/Library`, Windows `%AppData%`
- Environment variable overrides: `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_HOME`, `OPENCODE_DB_PATH`
- Zero manual configuration — data found wherever it lives

**🔧 Provider Audit Fixes (Oracle Deep Review)**
- OpenCode search/stats no longer leak subagent sessions — all queries filter `parent_id IS NULL`
- Trace token data fixed — preserved as objects, aggregated via `tokens.total` (was coerced to 0)
- Codex default path fixed — `~/.codex` not `~/.codex/sessions/sessions`
- Gemini default path fixed — `~/.gemini` not `~/.gemini/tmp/tmp`
- Claude Code detection by data directory — removed `which claude` dependency
- Claude Code parser dual-format support — top-level + nested message records
- Added `tool_use` record type parsing
- Stale index entries cleared on reindex

**🚫 Subagent Filtering**
- OpenCode session list shows only user-initiated conversations — filters 85% automated subagent sessions
- Search results, token stats, model distribution all filtered

### v1.1.1 — Security Fixes & Visual Polish

**🔒 Security**
- Markdown link XSS fix — URL scheme whitelist (http/https/mailto/relative only)
- Server binds to `127.0.0.1` — no LAN exposure
- Request body capped at 1MB — DoS prevention
- Trace API capped at 200 steps — browser freeze prevention
- Symlink skipping in file-based providers — traversal attack prevention
- Session ID validation — length + character sanitization
- Session existence check before metadata mutations
- Error messages sanitized — no internal details exposed to client

**🎨 Visual Polish**
- Unified `:focus-visible` ring + `active` feedback on all interactive elements
- Topbar 3-column grid layout (Logo / Providers centered / Actions)
- Session card borders, 2-line title clamp, `focus-within` action reveal
- Trace panel loading spinner + empty state
- Trace colors migrated to CSS variables (9 semantic + 4 z-index levels)
- ⚡ Dedicated trace button separates tool expansion from trace opening

### v1.1.0 — Trace Visualization & Provider Fixes

**🔮 Trace Visualization (New Feature)**
- Call chain tree panel in session detail (500px, grid layout)
- Named agents: Sisyphus / Momus / Explorer / Librarian / Junior
- Hierarchical indent: Agent → Skill → MCP → Tool parent-child
- Color coded: 🤖Agent(pink) 🎯Skill(orange) 🧠MCP(green) 🔧Tool(cyan) 📡LSP(blue)
- Chronological ordering, collapsible steps, summary footer

**🔧 Provider Fixes**
- OpenCode search/stats now filter subagent sessions (`parent_id IS NULL`)
- Trace token data preserved as objects (was coerced to 0)
- Codex default path fixed (`~/.codex` not `~/.codex/sessions/sessions`)
- Gemini default path fixed (`~/.gemini` not `~/.gemini/tmp/tmp`)
- Claude Code detection by data directory (removed `which claude` dependency)
- Claude Code parser supports both top-level and nested record formats
- Added `tool_use` record type parsing
- Stale index entries cleared on reindex

**🖥️ UI Changes**
- Merged topbar: provider tabs inline (112px → 48px single bar)
- Official SVG logos (OpenCode/Claude/OpenAI/Gemini)
- Session detail sidebar removed, full-width layout
- Compact session header (metadata in single line)
- All providers always shown, unavailable ones grayed out
- Responsive breakpoints (768px/480px)

### v1.0.0 — Initial Release

- Multi-provider adapter architecture (OpenCode / Claude Code / Codex CLI / Gemini CLI)
- Session browsing, search, time-range filtering
- Star, rename, soft-delete, batch operations (OpenCode)
- Token usage stats (trend chart + model distribution)
- Markdown / JSON export
- Dark/light theme auto-detection
- Chinese/English i18n
- Zero external dependencies

---

## 📄 License

MIT — use it, have fun 🎉
