<p align="center">
  <img src="./docs/preview-dashboard.png" alt="oh-my-opensession" width="720" />
</p>

<h1 align="center">✨ OpenSession ✨</h1>

<p align="center">
  <strong>🖥️ Your AI pair-programming "memoir" — a terminal-styled <a href="https://opencode.ai">OpenCode</a> session browser</strong>
</p>

<p align="center">
  <a href="./README.en.md">English</a> · <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/dependencies-0-blue?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/version-0.2.0-orange?style=flat-square" alt="Version" />
</p>

<p align="center">
  <em>Every conversation with AI deserves to be remembered 📖</em><br/>
  <em>Like scrolling through old chats with a friend — except this one writes code 🤖</em>
</p>

---

## 🤔 What is this?

Ever caught yourself thinking—

> "How did I get Claude to fix that bug last week?"
> "That regex AI wrote was *chef's kiss* — where did it go?"
> "How many tokens have I burned through? 💸"

**oh-my-opensession** is here to help. It's a local web app that lets you browse, search, and manage all your OpenCode sessions — with dark mode, terminal aesthetics, and a sprinkle of geek romance 🌙

---

## 🎬 Preview

<details open>
<summary><strong>🏠 Dashboard — terminal vibes, developer romance</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-dashboard.png" alt="Dashboard" width="720" />
</p>
</details>

<details>
<summary><strong>💬 Session Detail — every late-night chat with AI</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-session-detail.png" alt="Session Detail" width="720" />
</p>
<p align="center">
  <img src="./docs/preview-session-chat.png" alt="Session Chat" width="720" />
</p>
</details>

<details>
<summary><strong>📊 Token Stats — how's your wallet doing?</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-stats.png" alt="Stats" width="720" />
</p>
</details>

<details>
<summary><strong>🗂️ Batch Management — Marie Kondo your sessions</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-batch-manage.png" alt="Batch Management" width="720" />
</p>
</details>

---

## 🚀 3-Second Launch

```bash
npx opensession
```

> 💡 Open `http://localhost:3456` and start archaeologizing your AI coding journey!

Want it permanent?

```bash
npm install -g opensession
opensession --open  # auto-opens browser, for the lazy among us
```

Or run from source:

```bash
git clone https://github.com/HeavyBunny19C/oh-my-opensession.git
cd oh-my-opensession
npm start
```

---

## ✨ What can it do?

| | Feature | TL;DR |
|:---:|:---|:---|
| 🌙 | **Dark Mode** | Auto-follows system preference. Late-night coding without the eye burn |
| 🖥️ | **Terminal Aesthetic** | Code-block cards + grid background. Makes you *want* to code |
| 🔍 | **Search & Filter** | By keyword, time range. No more needle-in-a-haystack |
| ♾️ | **Infinite Scroll** | Silky smooth loading. No more page-clicking carpal tunnel |
| ⭐ | **Star** | Bookmark the good stuff. Find it in one second next time |
| ✏️ | **Rename** | "untitled-session-47"? Not on our watch |
| 🗑️ | **Soft Delete** | Fat-fingered a delete? Trash has your back |
| 📤 | **Export** | Markdown / JSON one-click export. Blog material: acquired |
| 📊 | **Token Stats** | Usage trends, model distribution. See where the money went |
| 🔔 | **Toast Notifications** | Every action gets feedback. No more staring at the screen |
| 🗂️ | **Batch Operations** | Multi-select star/delete. Efficiency: maxed out |
| 🌐 | **Bilingual** | `--lang en` for English, `--lang zh` for Chinese |
| 🔒 | **Read-Only Safe** | Never touches your OpenCode DB. Pinky promise |
| 📦 | **Zero Dependencies** | Just Node.js. No node_modules black hole |

---

## 🛠️ Requirements

- **Node.js** >= 22.5.0 (uses built-in `node:sqlite`, hence the version bump)
- [OpenCode](https://opencode.ai) installed with session data (runs without data too, just... empty 😅)

| Platform | Architecture | Status |
|:---|:---|:---:|
| 🍎 macOS | x64 / Apple Silicon (arm64) | ✅ |
| 🪟 Windows | x64 / arm64 | ✅ |
| 🐧 Linux | x64 / arm64 | ✅ |

> Pure JS, zero native dependencies — if Node.js runs, we run 🏃

## ⚙️ CLI Options

```
Option                  Description                   Default
--port <number>         Server port                    3456
--db <path>            Path to opencode.db             Auto-detect
--lang <en|zh>         UI language                     Auto-detect
--open                 Open browser on start           false
-h, --help             Show help                       —
```

## 🔧 Environment Variables

| Variable | Description |
|:---|:---|
| `PORT` | Server port (`--port` takes priority) |
| `SESSION_VIEWER_DB_PATH` | Path to opencode.db (`--db` takes priority) |
| `OPENSESSION_META_PATH` | Metadata DB path |

---

## 🧠 How It Works

```
┌─────────────────────────────────────────┐
│  OpenCode DB (read-only)                │
│  └── session / message / part / todo    │
└──────────────┬──────────────────────────┘
               │ SELECT (never INSERT/UPDATE)
               ▼
┌─────────────────────────────────────────┐
│  OpenSession                            │
│  ├── Server-side rendered HTML          │
│  ├── Infinite scroll API                │
│  └── Management ops → meta.db (separate)│
└──────────────┬──────────────────────────┘
               │ http://localhost:3456
               ▼
┌─────────────────────────────────────────┐
│  🌙 Your Browser                        │
│  └── Dark mode / Terminal UI / Toasts   │
└─────────────────────────────────────────┘
```

Your OpenCode data is **absolutely safe** — we look but don't touch. Stars, renames, and deletes live in a separate `meta.db`:

```
macOS:   ~/.config/opensession/meta.db
Windows: %APPDATA%\opensession\meta.db
```

---

## 📖 Installation Guide for Humans

> Step by step. No rush. Five minutes tops.

### Step 1: Check Node.js Version

```bash
node --version
# Must be v22.5.0 or higher
```

**Too old?** Use [nvm](https://github.com/nvm-sh/nvm) to upgrade:

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc  # or source ~/.zshrc

# Install and use Node.js 22
nvm install 22
nvm use 22
node --version  # confirm >= 22.5.0
```

> Windows users: try [nvm-windows](https://github.com/coreybutler/nvm-windows) or download v22+ from [nodejs.org](https://nodejs.org/).

### Step 2: Confirm OpenCode Session Data Exists

```bash
# macOS / Linux
ls ~/.local/share/opencode/opencode.db

# Windows (PowerShell)
dir "$env:LOCALAPPDATA\opencode\opencode.db"
```

If the file doesn't exist, that's OK — the app runs fine, just with no data. Install [OpenCode](https://opencode.ai) and use it, the DB will be created automatically.

### Step 3: Clone and Run

```bash
git clone https://github.com/HeavyBunny19C/oh-my-opensession.git
cd oh-my-opensession
npm start
```

You should see something like:

```
OpenSession running at http://localhost:3456
Language: en
DB: /Users/xxx/.local/share/opencode/opencode.db
42 sessions, 1337 messages.
```

Open `http://localhost:3456` in your browser.

### Step 4: Optional - Auto-open Browser

```bash
npm run dev
```

### Troubleshooting

| Problem | Solution |
|:---|:---|
| `Error: Cannot find module 'node:sqlite'` | Node.js version is below 22.5.0 — please upgrade |
| `Error: listen EADDRINUSE :::3456` | Port 3456 is taken. Use `node bin/cli.mjs --port 3457` |
| Starts with `0 sessions` | No OpenCode session data, or wrong DB path. Use `--db /path/to/opencode.db` |
| `SQLITE_CANTOPEN` | DB file not found or no read permission — check the path and permissions |

---

## 🤖 Installation Guide for AI Agents

> Structured instructions for AI coding assistants (Claude, ChatGPT, Cursor, Copilot, etc.) to help users install this project.

<details>
<summary><strong>Expand AI Installation Instructions</strong></summary>

### CONTEXT

- **Project**: oh-my-opensession — local web app for browsing and managing OpenCode sessions
- **Runtime**: Node.js >= 22.5.0 (depends on built-in `node:sqlite` module)
- **Dependencies**: Zero — no `npm install` needed
- **Source**: `https://github.com/HeavyBunny19C/oh-my-opensession.git`
- **npm**: Published. `npx oh-my-opensession` works out of the box.
- **Default port**: 3456
- **OpenCode DB location**:
  - macOS / Linux: `~/.local/share/opencode/opencode.db` (XDG-compliant, respects `$XDG_DATA_HOME`)
  - Windows: `%LOCALAPPDATA%\opencode\opencode.db`

### INSTALLATION STEPS

```
STEP 1: Verify Node.js version
  RUN: node --version
  EXPECT: v22.5.0 or higher
  ON FAILURE: Guide user to install Node.js 22+ via nvm, fnm, or nodejs.org
  ERROR PATTERN: "Cannot find module 'node:sqlite'" → Node.js version too old

STEP 2: Clone repository
  RUN: git clone https://github.com/HeavyBunny19C/oh-my-opensession.git
  RUN: cd oh-my-opensession

STEP 3: Start server
   RUN: npm start
   OR:  node bin/cli.mjs [options]
   EXPECT OUTPUT: "OpenSession running at http://localhost:3456"
   ON SUCCESS: Open http://localhost:3456 in browser

STEP 4 (optional): Custom options
  RUN: node bin/cli.mjs --port <PORT> --db <PATH> --lang <en|zh> --open
```

### ERROR HANDLING

```
ERROR: "listen EADDRINUSE :::3456"
  CAUSE: Port 3456 already in use
  FIX: node bin/cli.mjs --port 3457

ERROR: "Cannot find module 'node:sqlite'"
  CAUSE: Node.js < 22.5.0
  FIX: Upgrade Node.js to 22.5.0+

ERROR: "SQLITE_CANTOPEN"
  CAUSE: opencode.db not found at default path
  FIX: node bin/cli.mjs --db /actual/path/to/opencode.db
  FIND DB: find ~ -name "opencode.db" -type f 2>/dev/null

ERROR: "0 sessions, 0 messages"
  CAUSE: OpenCode not yet used, or wrong DB path
  FIX: Use OpenCode first, or specify correct --db path
```

### KEY FACTS FOR AI AGENTS

- **Read-only**: Never modifies the OpenCode database — SELECT queries only
- **Meta storage**: Stars/renames/deletes are stored in a separate `meta.db` (macOS: `~/.config/opensession/meta.db`)
- **Zero install**: Clone and run — no `npm install` required (zero-dependency project)
- **ESM only**: Uses ES Modules (`"type": "module"`), entry point is `bin/cli.mjs`
- **No build step**: No compilation, no bundling — plain JavaScript

</details>

---

## 💖 Donate

If this project made you smile, consider buying me a Mixue ice cream 🍦

<p align="center">
  <img src="./docs/wechat-pay.jpeg" alt="WeChat Pay" width="250" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./docs/alipay.jpeg" alt="Alipay" width="250" />
</p>
<p align="center">
  <sub>WeChat Pay &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Alipay</sub>
</p>

---

## 📄 License

MIT — use it, have fun 🎉
