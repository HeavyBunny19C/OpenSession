import { escapeHtml, renderMarkdown } from "../markdown.mjs";
import { t } from "../i18n.mjs";

function formatCount(value, prefix = "") {
  const amount = Number(value) || 0;
  return `${prefix}${amount}`;
}

function stringifyData(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value ?? "");
  }
}

function truncate(value, limit = 3000) {
  const text = stringifyData(value);
  return text.length > limit ? `${text.slice(0, limit)}\n\n${t("truncated")}` : text;
}

function toolDescription(tool, input) {
  if (!input || typeof input !== "object") {
    return tool;
  }

  const candidates = [input.filePath, input.command, input.pattern, input.url, input.description];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return match ? `${tool} — ${match}` : tool;
}

function formatTokens(tokens) {
  if (!tokens || typeof tokens !== "object") {
    return "";
  }

  const pieces = [];
  if (tokens.total != null) pieces.push(`${tokens.total} tokens`);
  if (tokens.input != null) pieces.push(`${t("tool.input")} ${tokens.input}`);
  if (tokens.output != null) pieces.push(`${t("tool.output")} ${tokens.output}`);
  return pieces.join(" · ");
}

export function formatTime(ts) {
  const value = Number(ts);
  if (!value) {
    return "";
  }

  const diff = Date.now() - value;
  if (diff < 60_000) return t("time.just_now");
  if (diff < 3_600_000) return t("time.minutes_ago").replace("{n}", Math.floor(diff / 60_000));
  if (diff < 86_400_000) return t("time.hours_ago").replace("{n}", Math.floor(diff / 3_600_000));
  if (diff < 7 * 86_400_000) return t("time.days_ago").replace("{n}", Math.floor(diff / 86_400_000));
  return new Date(value).toLocaleDateString();
}

export function formatDuration(startMs, endMs) {
  const start = Number(startMs);
  const end = Number(endMs);
  if (!start || !end || end < start) {
    return "";
  }

  const totalSeconds = Math.round((end - start) / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function sessionCard(s, active = false, { showCheckbox = false, provider = "opencode" } = {}) {
  const title = s.title || s.slug || s.id;
  const classes = ["session-card"];
  if (active) classes.push("active");
  if (s.starred) classes.push("starred");

  const checkboxHtml = showCheckbox
    ? `<input type="checkbox" class="card-checkbox" data-id="${escapeHtml(s.id)}">`
    : "";

  const actionsHtml = provider === "opencode" ? `
    <div class="card-actions">
      <button class="star-btn ${s.starred ? "starred" : ""}" data-id="${escapeHtml(s.id)}" title="${t("batch.star")}">
        ${s.starred ? "★" : "☆"}
      </button>
      <button class="card-menu-trigger" data-id="${escapeHtml(s.id)}" title="More">⋮</button>
      <div class="card-menu hidden" data-id="${escapeHtml(s.id)}">
        <button data-action="rename" data-id="${escapeHtml(s.id)}">${t("menu.rename")}</button>
        <button data-action="export-md" data-id="${escapeHtml(s.id)}">${t("menu.export_md")}</button>
        <button data-action="export-json" data-id="${escapeHtml(s.id)}">${t("menu.export_json")}</button>
        <button data-action="delete" data-id="${escapeHtml(s.id)}" class="menu-danger">${t("menu.delete")}</button>
      </div>
    </div>
  ` : "";

  return `<article class="${classes.join(" ")}" data-session-id="${escapeHtml(s.id)}">
    ${checkboxHtml}
    <a href="/${provider}/session/${encodeURIComponent(s.id)}" class="session-card-link">
      <header class="session-card-header">
        <h2 class="session-card-title">${escapeHtml(title)}</h2>
        <time class="session-card-time" datetime="${new Date(Number(s.time_updated) || Date.now()).toISOString()}">${escapeHtml(formatTime(s.time_updated))}</time>
      </header>
      <p class="session-card-directory">${escapeHtml(s.directory || "")}</p>
      <footer class="session-card-stats">
        <span>${t("card.files").replace("{count}", formatCount(s.summary_files))}</span>
        <span class="additions">+${formatCount(s.summary_additions)}</span>
        <span class="deletions">-${formatCount(s.summary_deletions)}</span>
      </footer>
    </a>
    ${actionsHtml}
  </article>`;
}

export function messageBubble(role, content, meta = {}) {
  const safeRole = escapeHtml(role || "unknown");
  const model = meta.model ? `<span class="message-model">${escapeHtml(meta.model)}</span>` : "";
  const tokens = formatTokens(meta.tokens);
  const tokenMarkup = tokens ? `<span class="message-tokens">${escapeHtml(tokens)}</span>` : "";
  const time = meta.time ? `<time class="message-time">${escapeHtml(formatTime(meta.time))}</time>` : "";
  const body = role === "assistant"
    ? `<div class="message-body markdown">${renderMarkdown(content || "")}</div>`
    : `<pre class="message-body plain">${escapeHtml(content || "")}</pre>`;

  return `<section class="message message-${safeRole}">
    <header class="message-meta">
      <span class="message-role">${safeRole}</span>
      ${model}
      ${tokenMarkup}
      ${time}
    </header>
    ${body}
  </section>`;
}

export function toolCallBlock(tool, input, output, status, duration) {
  const inputText = truncate(input);
  const outputText = truncate(output);
  const safeStatus = escapeHtml(status || "unknown");
  const safeDuration = duration ? `<span class="tool-duration">${escapeHtml(duration)}</span>` : "";
  const summary = escapeHtml(toolDescription(tool || "tool", input));

  return `<details class="tool-call tool-status-${safeStatus}">
    <summary>
      <span class="tool-name">${summary}</span>
      <span class="tool-status">${safeStatus}</span>
      ${safeDuration}
    </summary>
    <div class="tool-panels">
      <section>
        <h4>${t("tool.input")}</h4>
        <pre>${escapeHtml(inputText)}</pre>
      </section>
      <section>
        <h4>${t("tool.output")}</h4>
        <pre>${escapeHtml(outputText)}</pre>
      </section>
    </div>
  </details>`;
}

export function todoList(todos = []) {
  if (!todos.length) {
    return "";
  }

  const icons = {
    completed: "✓",
    in_progress: "◉",
    pending: "○"
  };

  const items = todos.map((todo) => {
    const icon = icons[todo.status] || "○";
    return `<li class="todo-item todo-${escapeHtml(todo.status || "pending")}">
      <span class="todo-icon">${icon}</span>
      <span class="todo-content">${escapeHtml(todo.content || "")}</span>
    </li>`;
  }).join("\n");

  return `<section class="todo-list-wrap">
    <h3>${t("todo.title")}</h3>
    <ul class="todo-list">${items}</ul>
  </section>`;
}

export function pagination(total, limit, offset, baseUrl) {
  const totalCount = Number(total) || 0;
  const pageSize = Number(limit) || 1;
  const currentOffset = Number(offset) || 0;

  if (totalCount <= pageSize) {
    return "";
  }

  const currentPage = Math.floor(currentOffset / pageSize) + 1;
  const totalPages = Math.ceil(totalCount / pageSize);
  const pages = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const pageOffset = (page - 1) * pageSize;
    const href = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}offset=${pageOffset}`;
    pages.push(`<a href="${escapeHtml(href)}" class="pagination-link${page === currentPage ? " active" : ""}">${page}</a>`);
  }

  return `<nav class="pagination">${pages.join("")}</nav>`;
}
