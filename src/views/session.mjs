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

function renderPart(messageData, partData) {
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
      formatDuration(timing.start, timing.end)
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
      <p class="session-directory">${escapeHtml(session.directory || "")}</p>
      <dl class="session-summary">
         <div><dt>${t("detail.created")}</dt><dd>${escapeHtml(new Date(Number(session.time_created) || Date.now()).toLocaleString())}</dd></div>
         <div><dt>${t("detail.updated")}</dt><dd>${escapeHtml(new Date(Number(session.time_updated) || Date.now()).toLocaleString())}</dd></div>
         <div><dt>${t("detail.files")}</dt><dd>${escapeHtml(String(Number(session.summary_files) || 0))}</dd></div>
         <div><dt>${t("detail.additions")}</dt><dd>+${escapeHtml(String(Number(session.summary_additions) || 0))}</dd></div>
         <div><dt>${t("detail.deletions")}</dt><dd>-${escapeHtml(String(Number(session.summary_deletions) || 0))}</dd></div>
      </dl>
${actions}
    </header>
  `;

  const messageMarkup = messages.map((message) => {
    const messageData = safeParse(message.data);
    const parts = partsByMessage.get(message.id) || [];
    const renderedParts = parts.map((part) => renderPart(messageData, safeParse(part.data))).filter(Boolean).join("\n");
    return renderedParts ? `<article class="message-group">${renderedParts}</article>` : "";
  }).filter(Boolean).join("\n");

  const sidebarCards = (recentSessions || []).map(s => sessionCard(s, s.id === session.id, { provider })).join("\n");

  const body = `
<div class="two-column">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h3>${t("detail.sidebar_title")}</h3>
    </div>
    <div class="sidebar-list">
      ${sidebarCards}
    </div>
  </aside>
  <div class="main-content">
    ${header}
    ${todoList(todos)}
    <section class="messages">
      ${messageMarkup || `<p class="empty-state">${t("detail.no_messages")}</p>`}
    </section>
  </div>
</div>
  `;

  return layout(title, body, "home", { provider, providers });
}
