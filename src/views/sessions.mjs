import { escapeHtml } from "../markdown.mjs";
import { layout } from "./layout.mjs";
import { sessionCard } from "./components.mjs";
import { t } from "../i18n.mjs";

export function renderSessionsPage({
  sessions = [],
  total = 0,
  limit = 30,
  offset = 0,
  query = "",
  note = "",
  range = "",
  totalMessages = 0,
  deletedCount = 0,
  provider = "opencode",
  providers = []
} = {}) {
  const cards = sessions.length
    ? sessions.map((session) => sessionCard(session, false, { showCheckbox: true, provider })).join("\n")
    : query
      ? `<p class="empty-state">${t("sessions.empty_search").replace("{query}", escapeHtml(query))}</p>`
      : `<p class="empty-state">${t("sessions.empty")}</p>`;

  const searchNote = note ? `<p class="search-note">${escapeHtml(note)}</p>` : "";
  
  // Time range filter buttons
  const ranges = [
    { key: "", label: t("range.all") },
    { key: "today", label: t("range.today") },
    { key: "week", label: t("range.week") },
    { key: "month", label: t("range.month") }
  ];
  const rangeParam = range || "";
  const rangeButtons = ranges.map(r => {
    const active = r.key === rangeParam ? " active" : "";
    const href = r.key ? `/${provider}?range=${r.key}` : `/${provider}`;
    return `<a href="${href}" class="range-btn${active}">${r.label}</a>`;
  }).join("");
  const filterBar = `<div class="range-filter">${rangeButtons}</div>`;
  const dashboard = `
    <section class="dashboard-grid">
      <a href="#session-list" class="dash-card">
        <div class="dash-card-header">
          <span class="dash-file">sessions/</span>
          <span class="dash-badge">db</span>
        </div>
        <div class="dash-card-body">
          <div class="dash-line"><span class="ck">"name"</span>: <span class="cs">"${t("sessions.title")}"</span>,</div>
          <div class="dash-line"><span class="ck">"count"</span>: <span class="cn">${total}</span><span class="cc"> // ${t("sessions.count").replace("{count}", total)}</span></div>
        </div>
        <div class="dash-card-footer">
          <span class="dash-cmd">$ ls sessions</span>
          <span class="dash-arrow">\u2192</span>
        </div>
      </a>
      <a href="/${provider}/stats" class="dash-card">
        <div class="dash-card-header">
          <span class="dash-file">stats.json</span>
          <span class="dash-badge">api</span>
        </div>
        <div class="dash-card-body">
          <div class="dash-line"><span class="ck">"name"</span>: <span class="cs">"${t("nav.stats")}"</span>,</div>
          <div class="dash-line"><span class="ck">"messages"</span>: <span class="cn">${totalMessages}</span><span class="cc"> // ${t("stats.total_messages")}</span></div>
        </div>
        <div class="dash-card-footer">
          <span class="dash-cmd">$ watch stats</span>
          <span class="dash-arrow">\u2192</span>
        </div>
      </a>
      ${provider === "opencode" ? `
      <a href="/${provider}/trash" class="dash-card">
        <div class="dash-card-header">
          <span class="dash-file">trash/</span>
          <span class="dash-badge">sys</span>
        </div>
        <div class="dash-card-body">
          <div class="dash-line"><span class="ck">"name"</span>: <span class="cs">"${t("nav.trash")}"</span>,</div>
          <div class="dash-line"><span class="ck">"count"</span>: <span class="cn">${deletedCount}</span><span class="cc"> // ${t("trash.count").replace("{count}", deletedCount)}</span></div>
        </div>
        <div class="dash-card-footer">
          <span class="dash-cmd">$ ls trash</span>
          <span class="dash-arrow">\u2192</span>
        </div>
      </a>` : ""}
    </section>
  `;
  
  const body = `
    ${!query ? dashboard : ""}
    <section class="page-header">
      <div class="page-header-row">
        <div>
          <h1>${query ? t("sessions.search_title").replace("{query}", escapeHtml(query)) : t("sessions.title")}</h1>
          <p>${t("sessions.count").replace("{count}", total)}</p>
        </div>
        ${!query && provider === "opencode" ? `<button class="btn btn-manage" id="toggle-batch">${t("sessions.manage")}</button>` : ""}
      </div>
      ${searchNote}
      ${!query ? filterBar : ""}
    </section>
    ${provider === "opencode" ? `
    <div class="batch-bar hidden" id="batch-bar">
      <label class="batch-select-all">
        <input type="checkbox" id="select-all"> ${t("batch.select_all")}
      </label>
      <span class="batch-count">${t("batch.selected").replace("<strong>{count}</strong>", '<strong id="batch-count-num">0</strong>')}</span>
      <button class="btn batch-action" data-action="star">${t("batch.star")}</button>
      <button class="btn batch-action" data-action="unstar">${t("batch.unstar")}</button>
      <button class="btn batch-action btn-danger" data-action="delete">${t("batch.delete")}</button>
      <button class="btn batch-action" id="batch-cancel">${t("batch.cancel")}</button>
    </div>` : ""}
    <section class="session-list" id="session-list">
      ${cards}
    </section>
    ${total > limit ? `<div id="scroll-sentinel" data-offset="${offset + sessions.length}" data-total="${total}" data-range="${escapeHtml(range)}" data-query="${escapeHtml(query)}" data-provider="${provider}"></div>` : ""}
  `;

  return layout(query ? t("sessions.search_title").replace("{query}", query) : t("sessions.title"), body, query ? "search" : "home", { provider, providers });
}
