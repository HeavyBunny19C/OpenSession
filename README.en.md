# oh-my-opensession

**[English](./README.en.md)** | **[中文](./README.md)**

A web-based session viewer and manager for [OpenCode](https://opencode.ai) — browse, search, star, rename, delete, and export your AI coding sessions.

## Features

- 📋 Browse and search all OpenCode sessions
- ⭐ Star/unstar sessions for quick access
- ✏️ Rename sessions with custom titles
- 🗑️ Soft delete with trash & restore
- 📤 Export sessions as Markdown or JSON
- 📊 Token usage statistics and charts
- 🌐 English & Chinese UI (`--lang en|zh`)
- 🔒 Read-only access to OpenCode DB — your data is safe
- 📦 Zero dependencies — just Node.js

## Quick Start

```bash
npx oh-my-opensession
```

Opens a web UI at `http://localhost:3456`.

## Installation

```bash
npm install -g oh-my-opensession
oh-my-opensession
```

## Requirements

- Node.js >= 22.5.0 (uses built-in `node:sqlite`)
- An existing [OpenCode](https://opencode.ai) installation with session data
- Supported platforms: macOS, Windows x64

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port <number>` | Server port | `3456` |
| `--db <path>` | Path to `opencode.db` | macOS: `~/.local/share/opencode/opencode.db`<br>Windows: `%LOCALAPPDATA%\opencode\opencode.db` |
| `--lang <en\|zh>` | UI language | Auto-detect from `LANG` |
| `--open` | Open browser on start | `false` |
| `-h, --help` | Show help | — |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (overridden by `--port`) |
| `SESSION_VIEWER_DB_PATH` | Path to `opencode.db` (overridden by `--db`) |
| `OH_MY_OPENSESSION_META_PATH` | Path to metadata DB |

## How It Works

oh-my-opensession reads your OpenCode SQLite database in **read-only mode** to display sessions. It never writes to your OpenCode data.

Management metadata (stars, renames, soft deletes) is stored in a separate `meta.db`:
- macOS: `~/.config/oh-my-opensession/meta.db`
- Windows: `%APPDATA%\oh-my-opensession\meta.db`

## Donate

If this project helps you, consider buying me a Mixue :)

<p align="center">
  <img src="./docs/wechat-pay.jpeg" alt="WeChat Pay" width="250" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./docs/alipay.jpeg" alt="Alipay" width="250" />
</p>
<p align="center">
  <sub>WeChat Pay &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Alipay</sub>
</p>

## License

MIT
