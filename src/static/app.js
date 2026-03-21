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
let cyInstance = null;
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
    renderGraph(0);
    updateTraceTitle();
    return;
  }
  const safeIndex = Math.max(0, Math.min(Number(stepIndex) || 0, steps.length - 1));
  currentStepIndex = safeIndex;
  renderTimeline();
  renderGraph(currentStepIndex);
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
    renderGraph(currentStepIndex);
    panelEl.classList.add("open");
    layoutEl.classList.add("trace-open");
    updateTraceTitle();
  } catch {
    traceData = { steps: [], summary: null };
    currentStepIndex = 0;
    renderTimeline();
    renderGraph(0);
    panelEl.classList.add("open");
    layoutEl.classList.add("trace-open");
    updateTraceTitle();
  }
}

function closeTracePanel() {
  const layoutEl = document.querySelector(".two-column");
  const panelEl = document.getElementById("trace-panel");
  const detailEl = document.getElementById("trace-node-detail");
  panelEl?.classList.remove("open");
  layoutEl?.classList.remove("trace-open");
  if (cyInstance) {
    cyInstance.destroy();
    cyInstance = null;
  }
  if (detailEl) detailEl.classList.add("hidden");
}

function renderTimeline() {
  const timelineEl = document.getElementById("trace-timeline");
  if (!timelineEl) return;

  const steps = Array.isArray(traceData?.steps) ? traceData.steps : [];
  if (!steps.length) {
    timelineEl.innerHTML = '<div class="trace-empty">No trace data available</div>';
    return;
  }

  const content = steps
    .map((step, stepIndex) => {
      const spans = Array.isArray(step?.spans) ? step.spans : [];
      const stepDuration = getTraceStepDuration(step);
      const stepStart = Number(step?.timeStart);
      const cost = Number(step?.cost);
      const tokenTotal = Number(step?.tokens?.total) || 0;
      const activeCls = stepIndex === currentStepIndex ? " active" : "";
      const spanRows = spans
        .map((span) => {
          const category = String(span?.category || "text");
          const spanStart = Number(span?.timeStart);
          const spanDurationRaw = Number(span?.duration);
          const spanDuration = Number.isFinite(spanDurationRaw) && spanDurationRaw >= 0
            ? spanDurationRaw
            : (() => {
                const spanEnd = Number(span?.timeEnd);
                if (Number.isFinite(spanStart) && Number.isFinite(spanEnd) && spanEnd >= spanStart) return spanEnd - spanStart;
                return 0;
              })();
          const leftPct = stepDuration > 0 && Number.isFinite(spanStart) && Number.isFinite(stepStart)
            ? Math.max(0, Math.min(100, ((spanStart - stepStart) / stepDuration) * 100))
            : 0;
          const widthPct = stepDuration > 0
            ? Math.max(Math.min((spanDuration / stepDuration) * 100, 100), 2)
            : 2;
          const errorCls = span?.status === "error" ? " status-error" : "";
          return `
            <div class="trace-span-row">
              <div class="trace-span-label" title="${escapeHtmlClient(span?.name || "")}">${escapeHtmlClient(truncateTraceText(span?.name || "", 60))}</div>
              <div class="trace-span-track">
                <div class="trace-span-bar cat-${escapeHtmlClient(category)}${errorCls}" style="left:${leftPct.toFixed(2)}%;width:${widthPct.toFixed(2)}%;"></div>
              </div>
              <div class="trace-span-time">${Math.max(0, Math.round(spanDuration))}ms</div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="trace-step-block">
          <button class="trace-step-header${activeCls}" type="button" data-trace-step-index="${stepIndex}">
            Step ${stepIndex + 1} · ${escapeHtmlClient(step?.model || "unknown")} · ${Math.max(0, Math.round(stepDuration))}ms · $${Number.isFinite(cost) ? cost.toFixed(3) : "0.000"} · ${tokenTotal.toLocaleString()} tokens
          </button>
          <div class="trace-step-spans">${spanRows}</div>
        </section>
      `;
    })
    .join("");

  const summary = traceData?.summary || {};
  const summaryHtml = `
    <div class="trace-summary-row">
      <div class="trace-legend">
        <span class="trace-legend-item"><i class="trace-span-bar cat-reasoning"></i>Reasoning</span>
        <span class="trace-legend-item"><i class="trace-span-bar cat-tool"></i>Tool</span>
        <span class="trace-legend-item"><i class="trace-span-bar cat-mcp"></i>MCP</span>
        <span class="trace-legend-item"><i class="trace-span-bar cat-agent"></i>Agent</span>
      </div>
      <div class="trace-summary-totals">${Number(summary.totalSteps) || steps.length} steps · ${Number(summary.totalSpans) || 0} spans · ${Math.max(0, Math.round(Number(summary.totalDuration) || 0))}ms</div>
    </div>
  `;

  timelineEl.innerHTML = `${content}${summaryHtml}`;
}

function renderGraph(stepIndex) {
  const graphEl = document.getElementById("trace-graph");
  const detailEl = document.getElementById("trace-node-detail");
  if (!graphEl) return;
  if (cyInstance) {
    cyInstance.destroy();
    cyInstance = null;
  }
  if (detailEl) detailEl.classList.add("hidden");

  const steps = Array.isArray(traceData?.steps) ? traceData.steps : [];
  const step = steps[stepIndex];
  const spans = Array.isArray(step?.spans) ? step.spans : [];

  if (!step || !spans.length) {
    graphEl.innerHTML = '<div class="trace-empty">No trace data available</div>';
    return;
  }
  if (typeof window.cytoscape !== "function") {
    graphEl.innerHTML = '<div class="trace-empty">No trace data</div>';
    return;
  }

  graphEl.innerHTML = "";

  const colorMap = {
    reasoning: "#8b5cf6",
    skill: "#f59e0b",
    mcp: "#10b981",
    tool: "#06b6d4",
    lsp: "#3b82f6",
    agent: "#ec4899",
    text: "#64748b",
    invalid: "#475569",
    start: "#4ade80",
    end: "#f1f5f9"
  };

  const elements = [{ data: { id: "start", label: "▶", type: "start", color: colorMap.start, error: 0 } }];
  spans.forEach((span) => {
    const type = String(span?.category || "text");
    const isError = span?.status === "error";
    elements.push({
      data: {
        id: String(span?.id || `span-${Math.random().toString(36).slice(2, 8)}`),
        label: String(span?.name || "span"),
        type,
        duration: Math.max(0, Number(span?.duration) || 0),
        status: String(span?.status || "unknown"),
        input: span?.input,
        output: span?.output,
        color: colorMap[type] || colorMap.invalid,
        error: isError ? 1 : 0
      }
    });
  });
  elements.push({ data: { id: "end", label: "■", type: "end", color: colorMap.end, error: 0 } });

  const chain = ["start", ...spans.map((span) => String(span?.id || "")), "end"].filter(Boolean);
  for (let i = 0; i < chain.length - 1; i += 1) {
    elements.push({ data: { id: `edge-${i}-${chain[i]}-${chain[i + 1]}`, source: chain[i], target: chain[i + 1] } });
  }

  cyInstance = window.cytoscape({
    container: graphEl,
    elements,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: "data(label)",
          color: "#e2e8f0",
          "font-size": 10,
          "text-wrap": "wrap",
          "text-max-width": 140,
          "text-valign": "center",
          "text-halign": "center",
          shape: "round-rectangle",
          width: "label",
          height: 34,
          padding: "8px",
          "border-width": "mapData(error, 0, 1, 0, 2)",
          "border-color": "#ef4444"
        }
      },
      {
        selector: 'node[type = "start"], node[type = "end"]',
        style: {
          shape: "ellipse",
          width: 28,
          height: 28,
          color: "#0f172a",
          "font-size": 14,
          "font-weight": 700,
          padding: 0
        }
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#64748b",
          "target-arrow-color": "#64748b",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier"
        }
      }
    ],
    layout: {
      name: "breadthfirst",
      directed: true,
      spacingFactor: 1.2,
      padding: 20
    }
  });

  cyInstance.on("tap", "node", (event) => {
    const node = event.target;
    const data = node?.data?.() || {};
    if (!detailEl) return;
    detailEl.innerHTML = `
      <div><strong>${escapeHtmlClient(data.label || "")}</strong></div>
      <div>Category: ${escapeHtmlClient(data.type || "")}</div>
      <div>Duration: ${Math.max(0, Math.round(Number(data.duration) || 0))}ms</div>
      <div>Status: ${escapeHtmlClient(data.status || "unknown")}</div>
      <div>Input: ${escapeHtmlClient(truncateTraceText(data.input, 180) || "-")}</div>
      <div>Output: ${escapeHtmlClient(truncateTraceText(data.output, 180) || "-")}</div>
    `;
    detailEl.classList.remove("hidden");
  });

  cyInstance.on("tap", (event) => {
    if (event.target === cyInstance && detailEl) {
      detailEl.classList.add("hidden");
    }
  });
}

document.addEventListener("click", (e) => {
  const stepHeader = e.target.closest("[data-trace-step-index]");
  if (!stepHeader) return;
  switchStep(Number(stepHeader.dataset.traceStepIndex) || 0);
});

document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest(".trace-tab");
  if (!tabBtn) return;
  const panel = tabBtn.closest("#trace-panel") || document;
  const targetId = tabBtn.dataset.tab || "";
  if (!targetId) return;

  panel.querySelectorAll?.(".trace-tab").forEach((el) => {
    el.classList.remove("active");
  });
  panel.querySelectorAll?.(".trace-tab-content").forEach((el) => {
    el.classList.remove("active");
  });
  tabBtn.classList.add("active");
  const target = document.getElementById(targetId);
  if (target) target.classList.add("active");
  if (targetId === "trace-graph") {
    if (traceData) renderGraph(currentStepIndex);
    setTimeout(() => {
      cyInstance?.resize();
    }, 50);
  }
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
