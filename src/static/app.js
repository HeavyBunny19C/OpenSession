const __LOCALE__ = window.__LOCALE__ || "en";
const PROVIDER = document.body.dataset.provider || "opencode";
const __I18N__ = {
  en: {
    rename_prompt: "Enter new title:",
    delete_confirm: "Delete this session? You can restore it from Trash.",
    permanent_delete_confirm: "Permanently delete? This cannot be undone.",
    batch_delete_confirm: "Delete {count} sessions?",
    select_first: "Please select sessions first",
    starred_label: "★ Starred",
    star_label: "☆ Star",
    star_check: "Star",
    manage: "Manage",
    cancel_manage: "Cancel",
    toast_starred: "Starred",
    toast_unstarred: "Unstarred",
    toast_renamed: "Renamed",
    toast_deleted: "Moved to trash",
    toast_restored: "Restored",
    toast_permanent_deleted: "Permanently deleted",
    toast_batch_done: "{count} sessions updated",
    toast_error: "Operation failed",
    time_just_now: "just now",
    time_minutes_ago: "{n}m ago",
    time_hours_ago: "{n}h ago",
    time_days_ago: "{n}d ago",
    card_files: "{count} files",
    menu_rename: "Rename",
    menu_export_md: "Export MD",
    menu_export_json: "Export JSON",
    menu_delete: "Delete",
    scroll_all_loaded: "All sessions loaded",
    scroll_loading: "Loading..."
  },
  zh: {
    rename_prompt: "输入新标题：",
    delete_confirm: "确定要删除此会话？可在回收站恢复。",
    permanent_delete_confirm: "永久删除后无法恢复，确定？",
    batch_delete_confirm: "确定删除 {count} 个会话？",
    select_first: "请先选择会话",
    starred_label: "★ 已收藏",
    star_label: "☆ 收藏",
    star_check: "收藏",
    manage: "管理",
    cancel_manage: "取消管理",
    toast_starred: "已收藏",
    toast_unstarred: "已取消收藏",
    toast_renamed: "已重命名",
    toast_deleted: "已移至回收站",
    toast_restored: "已恢复",
    toast_permanent_deleted: "已永久删除",
    toast_batch_done: "已批量操作 {count} 个会话",
    toast_error: "操作失败",
    time_just_now: "刚刚",
    time_minutes_ago: "{n}分钟前",
    time_hours_ago: "{n}小时前",
    time_days_ago: "{n}天前",
    card_files: "{count} 个文件",
    menu_rename: "重命名",
    menu_export_md: "导出 MD",
    menu_export_json: "导出 JSON",
    menu_delete: "删除",
    scroll_all_loaded: "已全部加载",
    scroll_loading: "加载中..."
  }
};

function ft(key) {
  return __I18N__[__LOCALE__]?.[key] ?? __I18N__.en[key] ?? key;
}

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  function updateToggleIcon() {
    themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
  }
  updateToggleIcon();
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.theme = next;
    updateToggleIcon();
  });
}

// Toast notifications
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Show pending toast from previous page (survives reload)
try {
  const pending = sessionStorage.getItem("pendingToast");
  if (pending) {
    sessionStorage.removeItem("pendingToast");
    const { message, type } = JSON.parse(pending);
    showToast(message, type);
  }
} catch {}

function queueToast(message, type = "success") {
  sessionStorage.setItem("pendingToast", JSON.stringify({ message, type }));
}

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    document.getElementById("search-input").focus();
  }
  if (e.key === "Escape") {
    document.activeElement.blur();
  }
});

if (typeof hljs !== "undefined") {
  hljs.highlightAll();
}

const activeSidebarCard = document.querySelector(".sidebar .session-card.active");
if (activeSidebarCard) {
  activeSidebarCard.scrollIntoView({ block: "center", behavior: "instant" });
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".star-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.id;
  if (!id) return;
  try {
    const res = await fetch(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/star`, { method: "POST" });
    const data = await res.json();
    btn.classList.toggle("starred", data.starred);
    if (!btn.textContent.includes(ft("star_check"))) {
      btn.textContent = data.starred ? "★" : "☆";
    }
    if (btn.textContent.includes(ft("star_check"))) {
      btn.innerHTML = data.starred ? ft("starred_label") : ft("star_label");
    }
    const card = btn.closest(".session-card");
    if (card) card.classList.toggle("starred", data.starred);
    showToast(data.starred ? ft("toast_starred") : ft("toast_unstarred"), data.starred ? "success" : "info");
  } catch (err) {
    showToast(ft("toast_error"), "error");
  }
});

document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".card-menu-trigger");
  if (trigger) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll(".card-menu:not(.hidden)").forEach((menu) => {
      if (menu.dataset.id !== trigger.dataset.id) menu.classList.add("hidden");
    });
    const menu = trigger.nextElementSibling;
    if (menu) menu.classList.toggle("hidden");
    return;
  }
  if (!e.target.closest(".card-menu")) {
    document.querySelectorAll(".card-menu:not(.hidden)").forEach((menu) => {
      menu.classList.add("hidden");
    });
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!id || !action) return;

  if (btn.classList.contains("batch-action")) return;

  e.preventDefault();
  e.stopPropagation();

  if (action === "rename") {
    const card = btn.closest(".session-card");
    const current = card
      ? card.querySelector(".session-card-title")?.textContent || ""
      : document.querySelector(".session-header h1")?.textContent || "";
    const newTitle = prompt(ft("rename_prompt"), current);
    if (newTitle === null) return;
    try {
      await fetch(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      queueToast(ft("toast_renamed"), "success");
      location.reload();
    } catch {
      showToast(ft("toast_error"), "error");
    }
    return;
  }

  if (action === "delete") {
    if (!confirm(ft("delete_confirm"))) return;
    try {
      await fetch(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/delete`, { method: "POST" });
      queueToast(ft("toast_deleted"), "success");
      if (document.querySelector(".session-actions")) {
        location.href = `/${PROVIDER}`;
      } else {
        location.reload();
      }
    } catch {
      showToast(ft("toast_error"), "error");
    }
    return;
  }

  if (action === "restore") {
    try {
      await fetch(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/restore`, { method: "POST" });
      queueToast(ft("toast_restored"), "success");
      location.reload();
    } catch {
      showToast(ft("toast_error"), "error");
    }
    return;
  }

  if (action === "permanent-delete") {
    if (!confirm(ft("permanent_delete_confirm"))) return;
    try {
      await fetch(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/permanent-delete`, { method: "POST" });
      queueToast(ft("toast_permanent_deleted"), "success");
      location.reload();
    } catch {
      showToast(ft("toast_error"), "error");
    }
    return;
  }

  if (action === "export-md") {
    window.open(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/export?format=md`, "_blank");
    return;
  }

  if (action === "export-json") {
    window.open(`/api/${PROVIDER}/session/${encodeURIComponent(id)}/export?format=json`, "_blank");
  }
});

const toggleBatchBtn = document.getElementById("toggle-batch");
const batchBar = document.getElementById("batch-bar");
const sessionList = document.getElementById("session-list");
const batchCountNum = document.getElementById("batch-count-num");
const selectAllCheckbox = document.getElementById("select-all");
const batchCancelBtn = document.getElementById("batch-cancel");

let batchMode = false;

function updateBatchCount() {
  if (!batchCountNum) return;
  const checked = document.querySelectorAll(".card-checkbox:checked").length;
  batchCountNum.textContent = checked;
}

function setBatchMode(on) {
  batchMode = on;
  if (batchBar) batchBar.classList.toggle("hidden", !on);
  if (sessionList) sessionList.classList.toggle("batch-mode", on);
  if (toggleBatchBtn) toggleBatchBtn.textContent = on ? ft("cancel_manage") : ft("manage");
  if (!on) {
    document.querySelectorAll(".card-checkbox:checked").forEach((cb) => {
      cb.checked = false;
    });
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBatchCount();
  }
}

if (toggleBatchBtn) {
  toggleBatchBtn.addEventListener("click", () => setBatchMode(!batchMode));
}

if (batchCancelBtn) {
  batchCancelBtn.addEventListener("click", () => setBatchMode(false));
}

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
    document.querySelectorAll(".card-checkbox").forEach((cb) => {
      cb.checked = selectAllCheckbox.checked;
    });
    updateBatchCount();
  });
}

document.addEventListener("change", (e) => {
  if (e.target.classList.contains("card-checkbox")) updateBatchCount();
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".batch-action");
  if (!btn || btn.id === "batch-cancel") return;
  const action = btn.dataset.action;
  if (!action) return;
  const ids = [...document.querySelectorAll(".card-checkbox:checked")].map((cb) => cb.dataset.id);
  if (!ids.length) {
    alert(ft("select_first"));
    return;
  }
  if (action === "delete" && !confirm(ft("batch_delete_confirm").replace("{count}", ids.length))) return;

  try {
    await fetch(`/api/${PROVIDER}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids })
    });
    queueToast(ft("toast_batch_done").replace("{count}", ids.length), "success");
    location.reload();
  } catch {
    showToast(ft("toast_error"), "error");
  }
});

function formatTimeClient(ts) {
  const value = Number(ts);
  if (!value) {
    return "";
  }

  const diff = Date.now() - value;
  if (diff < 60_000) return ft("time_just_now");
  if (diff < 3_600_000) return ft("time_minutes_ago").replace("{n}", Math.floor(diff / 60_000));
  if (diff < 86_400_000) return ft("time_hours_ago").replace("{n}", Math.floor(diff / 3_600_000));
  if (diff < 7 * 86_400_000) return ft("time_days_ago").replace("{n}", Math.floor(diff / 86_400_000));
  return new Date(value).toLocaleDateString();
}

function escapeHtmlClient(str) {
  const el = document.createElement("div");
  el.textContent = str == null ? "" : String(str);
  return el.innerHTML;
}

function renderSessionCard(s) {
  const id = escapeHtmlClient(s.id);
  const title = escapeHtmlClient(s.title || s.id);
  const directory = escapeHtmlClient(s.directory || "");
  const timeUpdated = Number(s.time_updated) || Date.now();
  const classes = ["session-card"];
  if (s.starred) classes.push("starred");

  const actionsHtml = PROVIDER === "opencode" ? `
    <div class="card-actions">
      <button class="star-btn ${s.starred ? "starred" : ""}" data-id="${id}" title="${ft("star_check")}">
        ${s.starred ? "★" : "☆"}
      </button>
      <button class="card-menu-trigger" data-id="${id}" title="More">⋮</button>
      <div class="card-menu hidden" data-id="${id}">
        <button data-action="rename" data-id="${id}">${ft("menu_rename")}</button>
        <button data-action="export-md" data-id="${id}">${ft("menu_export_md")}</button>
        <button data-action="export-json" data-id="${id}">${ft("menu_export_json")}</button>
        <button data-action="delete" data-id="${id}" class="menu-danger">${ft("menu_delete")}</button>
      </div>
    </div>
  ` : "";

  return `<article class="${classes.join(" ")}" data-session-id="${id}">
    <input type="checkbox" class="card-checkbox" data-id="${id}">
    <a href="/${PROVIDER}/session/${encodeURIComponent(s.id)}" class="session-card-link">
      <header class="session-card-header">
        <h2 class="session-card-title">${title}</h2>
        <time class="session-card-time" datetime="${new Date(timeUpdated).toISOString()}">${escapeHtmlClient(formatTimeClient(timeUpdated))}</time>
      </header>
      <p class="session-card-directory">${directory}</p>
      <footer class="session-card-stats">
        <span>${ft("card_files").replace("{count}", String(Number(s.summary_files) || 0))}</span>
        <span class="additions">+${Number(s.summary_additions) || 0}</span>
        <span class="deletions">-${Number(s.summary_deletions) || 0}</span>
      </footer>
    </a>
    ${actionsHtml}
  </article>`;
}

const scrollSentinel = document.getElementById("scroll-sentinel");
if (scrollSentinel && sessionList && "IntersectionObserver" in window) {
  let scrollOffset = Number(scrollSentinel.dataset.offset) || 0;
  const scrollTotal = Number(scrollSentinel.dataset.total) || 0;
  const scrollRange = scrollSentinel.dataset.range || "";
  const scrollQuery = scrollSentinel.dataset.query || "";
  let isLoading = false;

  const setSentinelState = (className, text) => {
    scrollSentinel.className = className;
    scrollSentinel.textContent = text;
  };

  const observer = new IntersectionObserver(async (entries) => {
    const entry = entries[0];
    if (!entry?.isIntersecting || isLoading) {
      return;
    }

    isLoading = true;
    setSentinelState("scroll-loading", ft("scroll_loading"));

    try {
      const params = new URLSearchParams({
        offset: String(scrollOffset),
        limit: "30"
      });
      if (scrollRange) params.set("range", scrollRange);
      if (scrollQuery) params.set("q", scrollQuery);

      const res = await fetch(`/api/${PROVIDER}/sessions?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const markup = Array.isArray(data.sessions) ? data.sessions.map(renderSessionCard).join("") : "";
      sessionList.insertAdjacentHTML("beforeend", markup);
      scrollOffset = (Number(data.offset) || 0) + (Array.isArray(data.sessions) ? data.sessions.length : 0);

      if (!data.hasMore || scrollOffset >= scrollTotal) {
        observer.disconnect();
        setSentinelState("scroll-done", ft("scroll_all_loaded"));
      } else {
        setSentinelState("", "");
      }
    } catch {
      setSentinelState("", "");
      showToast(ft("toast_error"), "error");
    } finally {
      isLoading = false;
    }
  }, { rootMargin: "200px" });

  if (scrollOffset < scrollTotal) {
    observer.observe(scrollSentinel);
  } else {
    setSentinelState("scroll-done", ft("scroll_all_loaded"));
  }
}

let traceData = null;
let currentStepIndex = 0;

function truncateTraceText(value, maxLength = 220) {
  const text = value == null ? "" : String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function getTraceStepDuration(step) {
  const duration = Number(step?.duration);
  if (Number.isFinite(duration) && duration > 0) return duration;
  const start = Number(step?.timeStart);
  const end = Number(step?.timeEnd);
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
    return end - start;
  }
  return 0;
}

function updateTraceTitle() {
  const titleEl = document.getElementById("trace-title");
  const steps = Array.isArray(traceData?.steps) ? traceData.steps : [];
  const step = steps[currentStepIndex] || null;
  if (!titleEl) return;
  if (!step) {
    titleEl.textContent = "Trace";
    return;
  }
  titleEl.textContent = `Step ${currentStepIndex + 1}/${steps.length} · ${step.model || "unknown"} · ${Math.max(0, Math.round(getTraceStepDuration(step)))}ms`;
}

function switchStep(stepIndex) {
  const steps = Array.isArray(traceData?.steps) ? traceData.steps : [];
  if (!steps.length) {
    currentStepIndex = 0;
    renderTimeline();
    updateTraceTitle();
    return;
  }
  const safeIndex = Math.max(0, Math.min(Number(stepIndex) || 0, steps.length - 1));
  currentStepIndex = safeIndex;
  renderTimeline();
  updateTraceTitle();
}

async function openTracePanel(partId) {
  const layoutEl = document.querySelector(".two-column");
  const panelEl = document.getElementById("trace-panel");
  if (!layoutEl || !panelEl) return;

  const provider = layoutEl.dataset.provider || "";
  const sessionId = layoutEl.dataset.sessionId || "";
  if (provider !== "opencode") return;
  if (!sessionId) return;

  try {
    const res = await fetch(`/api/${encodeURIComponent(provider)}/session/${encodeURIComponent(sessionId)}/trace`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    traceData = data && typeof data === "object" ? data : { steps: [], summary: null };
    const steps = Array.isArray(traceData.steps) ? traceData.steps : [];
    const matchedIndex = steps.findIndex((step) =>
      Array.isArray(step?.spans) && step.spans.some((span) => String(span?.id || "") === String(partId || ""))
    );
    currentStepIndex = matchedIndex >= 0 ? matchedIndex : 0;

    renderTimeline();
    panelEl.classList.add("open");
    updateTraceTitle();
  } catch {
    traceData = { steps: [], summary: null };
    currentStepIndex = 0;
    renderTimeline();
    panelEl.classList.add("open");
    updateTraceTitle();
  }
}

function closeTracePanel() {
  const panelEl = document.getElementById("trace-panel");
  panelEl?.classList.remove("open");
}

function renderTimeline() {
  const timelineEl = document.getElementById("trace-timeline");
  if (!timelineEl) return;

  const steps = Array.isArray(traceData?.steps) ? traceData.steps : [];
  if (!steps.length) {
    timelineEl.innerHTML = '<div class="trace-empty">No trace data available</div>';
    return;
  }

  const allSpans = steps.flatMap((step, si) =>
    (Array.isArray(step?.spans) ? step.spans : []).map((span) => ({ ...span, _stepIndex: si, _step: step }))
  );

  const agentSpans = allSpans.filter((s) => s.category === "agent");
  const nonAgentSpans = allSpans.filter((s) => s.category !== "agent" && s.category !== "text" && s.category !== "invalid");

  const agentChains = agentSpans.map((agent) => {
    const stepSpans = allSpans.filter((s) => s._stepIndex === agent._stepIndex && s.id !== agent.id);
    const children = stepSpans.filter((s) => s.category !== "text" && s.category !== "invalid" && s.category !== "reasoning");
    return { agent, children };
  });

  const agentStepIndices = new Set(agentSpans.map((s) => s._stepIndex));
  const independentSpans = nonAgentSpans.filter((s) => !agentStepIndices.has(s._stepIndex));

  const mcpGroups = {};
  const toolCounts = {};
  independentSpans.forEach((s) => {
    if (s.category === "mcp") {
      const server = s.mcpServer || "unknown";
      if (!mcpGroups[server]) mcpGroups[server] = [];
      mcpGroups[server].push(s);
    } else if (s.category === "tool") {
      const name = s.name || "unknown";
      toolCounts[name] = (toolCounts[name] || 0) + 1;
    }
  });

  const catCounts = {};
  allSpans.forEach((s) => { catCounts[s.category] = (catCounts[s.category] || 0) + 1; });

  const renderChainNode = (span, indent = 0) => {
    const cat = escapeHtmlClient(span.category || "tool");
    const errorCls = span.status === "error" ? " chain-error" : "";
    const dur = Math.max(0, Math.round(Number(span.duration) || 0));
    const icons = { agent: "🤖", skill: "🎯", mcp: "🧠", tool: "🔧", lsp: "📡", reasoning: "💭" };
    const icon = icons[span.category] || "🔧";
    const label = span.category === "mcp" && span.mcpServer
      ? `${span.mcpServer}:${(span.name || "").replace(span.mcpServer + "_", "")}`
      : span.name || span.category;
    return `<div class="chain-node cat-bg-${cat}${errorCls}" style="margin-left:${indent * 20}px" data-trace-step-index="${span._stepIndex}">
      <span class="chain-dot cat-${cat}"></span>
      <span class="chain-icon">${icon}</span>
      <span class="chain-cat">${cat}</span>
      <span class="chain-label">${escapeHtmlClient(truncateTraceText(label, 50))}</span>
      <span class="chain-dur">${dur}ms</span>
      ${span.status === "error" ? '<span class="chain-status-err">error</span>' : ""}
    </div>`;
  };

  let html = `<div class="chain-summary">
    <span class="chain-stat"><span class="chain-dot cat-agent"></span>Agent ${catCounts.agent || 0}</span>
    <span class="chain-stat"><span class="chain-dot cat-skill"></span>Skill ${catCounts.skill || 0}</span>
    <span class="chain-stat"><span class="chain-dot cat-mcp"></span>MCP ${catCounts.mcp || 0}</span>
    <span class="chain-stat"><span class="chain-dot cat-tool"></span>Tool ${catCounts.tool || 0}</span>
    <span class="chain-stat"><span class="chain-dot cat-lsp"></span>LSP ${catCounts.lsp || 0}</span>
  </div>`;

  if (agentChains.length) {
    html += `<div class="chain-section-header">Agent Chains · ${agentChains.length} delegations</div>`;
    agentChains.forEach((chain) => {
      html += `<div class="chain-root">`;
      html += renderChainNode(chain.agent, 0);
      if (chain.children.length) {
        html += `<div class="chain-children">`;
        chain.children.forEach((child) => { html += renderChainNode(child, 1); });
        html += `</div>`;
      }
      html += `</div>`;
    });
  }

  const skillSpans = allSpans.filter((s) => s.category === "skill" && !agentStepIndices.has(s._stepIndex));
  if (skillSpans.length) {
    html += `<div class="chain-section-header">Standalone Skills · ${skillSpans.length}</div>`;
    skillSpans.forEach((s) => { html += renderChainNode(s, 0); });
  }

  if (Object.keys(mcpGroups).length) {
    const totalMcp = Object.values(mcpGroups).reduce((a, b) => a + b.length, 0);
    html += `<div class="chain-section-header">MCP Servers · ${totalMcp} calls</div>`;
    Object.entries(mcpGroups).sort((a, b) => b[1].length - a[1].length).forEach(([server, spans]) => {
      html += `<details class="chain-mcp-group"><summary class="chain-mcp-header"><span class="chain-dot cat-mcp"></span> 🧠 ${escapeHtmlClient(server)} <span class="chain-count">${spans.length}</span></summary>`;
      spans.slice(0, 10).forEach((s) => { html += renderChainNode(s, 1); });
      if (spans.length > 10) html += `<div class="chain-more">${spans.length - 10} more…</div>`;
      html += `</details>`;
    });
  }

  if (Object.keys(toolCounts).length) {
    const totalTools = Object.values(toolCounts).reduce((a, b) => a + b, 0);
    html += `<div class="chain-section-header">Tools · ${totalTools} calls</div>`;
    html += `<div class="chain-tool-chips">`;
    Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      html += `<span class="chain-tool-chip">${escapeHtmlClient(name)} ×${count}</span>`;
    });
    html += `</div>`;
  }

  const lspSpans = allSpans.filter((s) => s.category === "lsp" && !agentStepIndices.has(s._stepIndex));
  if (lspSpans.length) {
    html += `<div class="chain-section-header">LSP · ${lspSpans.length} calls</div>`;
    lspSpans.forEach((s) => { html += renderChainNode(s, 0); });
  }

  const summary = traceData?.summary || {};
  html += `<div class="chain-footer">${steps.length} steps · ${Number(summary.totalSpans) || 0} spans · $${Number(summary.totalCost)?.toFixed(2) || "0"} · ${(Number(summary.totalTokens) || 0).toLocaleString()} tokens</div>`;

  timelineEl.innerHTML = html;
}

document.addEventListener("click", (e) => {
  const stepHeader = e.target.closest("[data-trace-step-index]");
  if (!stepHeader) return;
  switchStep(Number(stepHeader.dataset.traceStepIndex) || 0);
});

document.addEventListener("click", async (e) => {
  const toolCall = e.target.closest(".tool-call[data-part-id]");
  if (!toolCall) return;
  const partId = toolCall.dataset.partId || "";
  if (!partId) return;
  await openTracePanel(partId);
});

document.addEventListener("click", (e) => {
  const closeBtn = e.target.closest(".trace-panel-close");
  if (!closeBtn) return;
  closeTracePanel();
});

(function autoOpenTrace() {
  const layoutEl = document.querySelector(".two-column[data-session-id][data-provider]");
  if (!layoutEl) return;
  const provider = layoutEl.dataset.provider || "";
  const sessionId = layoutEl.dataset.sessionId || "";
  if (provider !== "opencode" || !sessionId) return;
  openTracePanel(null);
})();
