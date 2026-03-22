import { escapeHtml } from "../markdown.mjs";
import { layout } from "./layout.mjs";
import { formatDuration, messageBubble, todoList, toolCallBlock, sessionCard } from "./components.mjs";
import { t } from "../i18n.mjs";

function safeParse(value) {
  if (typeof value !== "string") {
    return value || {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function modelLabel(model) {
  if (!model || typeof model !== "object") {
    return "";
  }

  if (model.providerID && model.modelID) {
    return `${model.providerID}/${model.modelID}`;
  }

  return model.modelID || model.providerID || "";
}

function renderPart(messageData, partData, partId) {
  if (!partData || typeof partData !== "object") {
    return "";
  }

  if (partData.type === "text") {
    return messageBubble(messageData.role, partData.text || "", {
      model: modelLabel(messageData.model),
      tokens: messageData.tokens,
      time: messageData.time?.created
    });
  }

  if (partData.type === "tool") {
    if (["todoread", "todowrite"].includes(partData.tool)) {
      return "";
    }

    const state = partData.state && typeof partData.state === "object" ? partData.state : {};
    const timing = state.time && typeof state.time === "object" ? state.time : {};
    return toolCallBlock(
      partData.tool,
      state.input,
      state.output,
      state.status,
      formatDuration(timing.start, timing.end),
      partId
    );
  }

  if (["step-start", "step-finish", "snapshot", "patch"].includes(partData.type)) {
    return "";
  }

  return "";
}

export function renderSessionPage({ session, messages = [], partsByMessage = new Map(), todos = [], recentSessions = [], meta = null, provider = "opencode", providers = [] }) {
  const title = session.title || session.slug || session.id;
  const starred = meta?.starred ? 1 : 0;
  const actions = provider === "opencode" ? `
      <div class="session-actions">
        <button class="star-btn action-btn ${starred ? "starred" : ""}" data-id="${escapeHtml(session.id)}">
          ${starred ? t("action.starred") : t("action.star")}
        </button>
        <button class="action-btn" data-action="rename" data-id="${escapeHtml(session.id)}">${t("action.rename")}</button>
        <a href="/api/${provider}/session/${encodeURIComponent(session.id)}/export?format=md" class="action-btn">${t("action.export_md")}</a>
        <a href="/api/${provider}/session/${encodeURIComponent(session.id)}/export?format=json" class="action-btn">${t("action.export_json")}</a>
        <button class="action-btn btn-danger" data-action="delete" data-id="${escapeHtml(session.id)}">${t("action.delete")}</button>
      </div>
  ` : "";
  const header = `
    <header class="session-header">
      <h1>${escapeHtml(title)}</h1>
      <div class="session-meta-row">
        <span class="session-directory">${escapeHtml(session.directory || "")}</span>
        <span class="session-meta-sep">·</span>
        <span>${escapeHtml(new Date(Number(session.time_created) || Date.now()).toLocaleString())}</span>
        <span class="session-meta-sep">·</span>
        <span>${escapeHtml(String(Number(session.summary_files) || 0))} ${t("detail.files")}</span>
        <span class="additions">+${escapeHtml(String(Number(session.summary_additions) || 0))}</span>
        <span class="deletions">-${escapeHtml(String(Number(session.summary_deletions) || 0))}</span>
      </div>
${actions}
    </header>
  `;

  const messageMarkup = messages.map((message) => {
    const messageData = safeParse(message.data);
    const parts = partsByMessage.get(message.id) || [];
    const renderedParts = parts.map((part) => renderPart(messageData, safeParse(part.data), part.id)).filter(Boolean).join("\n");
    return renderedParts ? `<article class="message-group">${renderedParts}</article>` : "";
  }).filter(Boolean).join("\n");

  const body = `
<div class="two-column" data-session-id="${escapeHtml(session.id)}" data-provider="${escapeHtml(provider)}">
  <div class="main-content">
    ${header}
    ${todoList(todos)}
    <section class="messages">
      ${messageMarkup || `<p class="empty-state">${t("detail.no_messages")}</p>`}
    </section>
  </div>
  <aside id="trace-panel" class="trace-panel">
    <div class="trace-panel-header">
      <h3 id="trace-title">Trace</h3>
      <button type="button" class="trace-panel-close">&times;</button>
    </div>
    <div id="trace-timeline" class="trace-tab-content active"></div>
  </aside>
</div>
  `;

  return layout(title, body, "home", { provider, providers });
}
