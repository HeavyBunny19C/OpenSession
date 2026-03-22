import os from "node:os";
import path from "node:path";
import { mkdirSync } from "node:fs";

function defaultDbPath() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "opencode", "opencode.db");
  }
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "opencode", "opencode.db");
}

function defaultMetaDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "oh-my-opensession");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "oh-my-opensession");
}

function defaultClaudeDir() {
  if (process.platform === "win32") {
    return path.join(process.env.USERPROFILE || os.homedir(), ".claude");
  }
  return path.join(os.homedir(), ".claude");
}

function defaultCodexDir() {
  if (process.platform === "win32") {
    return path.join(process.env.USERPROFILE || os.homedir(), ".codex");
  }
  return path.join(os.homedir(), ".codex");
}

function defaultGeminiDir() {
  if (process.platform === "win32") {
    return path.join(process.env.USERPROFILE || os.homedir(), ".gemini", "tmp");
  }
  return path.join(os.homedir(), ".gemini", "tmp");
}

const defaults = {
  port: 3456,
  dbPath: defaultDbPath(),
  metaDir: defaultMetaDir(),
  lang: "en",
  open: false,
  claudeDir: defaultClaudeDir(),
  codexDir: defaultCodexDir(),
  geminiDir: defaultGeminiDir(),
  reindex: false,
};

function detectLang() {
  const env = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || "";
  return env.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...defaults, lang: detectLang() };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) {
      config.port = Number(argv[++i]) || defaults.port;
    } else if ((argv[i] === "--opencode-db" || argv[i] === "--db") && argv[i + 1]) {
      config.dbPath = argv[++i];
    } else if (argv[i] === "--claude-dir" && argv[i + 1]) {
      config.claudeDir = argv[++i];
    } else if (argv[i] === "--codex-dir" && argv[i + 1]) {
      config.codexDir = argv[++i];
    } else if (argv[i] === "--gemini-dir" && argv[i + 1]) {
      config.geminiDir = argv[++i];
    } else if (argv[i] === "--reindex") {
      config.reindex = true;
    } else if (argv[i] === "--lang" && argv[i + 1]) {
      config.lang = argv[++i] === "zh" ? "zh" : "en";
    } else if (argv[i] === "--open") {
      config.open = true;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`oh-my-opensession — Multi-Provider Session Viewer & Manager

Usage: oh-my-opensession [options]

Options:
  --port <number>       Server port (default: 3456, env: PORT)
  --opencode-db <path>  Path to opencode.db (alias: --db, env: SESSION_VIEWER_DB_PATH)
  --claude-dir <path>   Path to Claude CLI data dir (default: ~/.claude)
  --codex-dir <path>    Path to Codex data dir (default: ~/.codex)
  --gemini-dir <path>   Path to Gemini data dir (default: ~/.gemini/tmp)
  --reindex             Force full reindex of all providers on start
  --lang <en|zh>        UI language (default: auto-detect from LANG)
  --open                Open browser on start
  -h, --help            Show this help`);
      process.exit(0);
    }
  }

  // Env overrides (lower priority than CLI)
  if (!argv.includes("--port") && process.env.PORT) {
    config.port = Number(process.env.PORT) || defaults.port;
  }
  if (!argv.includes("--db") && !argv.includes("--opencode-db") && process.env.SESSION_VIEWER_DB_PATH) {
    config.dbPath = process.env.SESSION_VIEWER_DB_PATH;
  }
  if (process.env.OH_MY_OPENSESSION_META_PATH) {
    config.metaDir = path.dirname(process.env.OH_MY_OPENSESSION_META_PATH);
  }

  config.metaPath = path.join(config.metaDir, "meta.db");

  // Ensure meta directory exists
  mkdirSync(config.metaDir, { recursive: true });

  return config;
}

let _config;

export function getConfig() {
  if (!_config) _config = parseArgs();
  return _config;
}

export function initConfig(argv) {
  _config = parseArgs(argv);
  return _config;
}
