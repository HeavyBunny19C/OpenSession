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

document.addEventListener("click", (e) => {
  const header = e.target.closest(".expandable");
  if (!header) return;
  const detail = header.nextElementSibling;
  if (detail) {
    detail.classList.toggle("hidden");
    const arrow = header.querySelector(".expand-arrow");
    if (arrow) arrow.textContent = detail.classList.contains("hidden") ? "▸" : "▾";
  }
});

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
    document.querySelectorAll(".card-menu:not(.hidden)").forEach((menu) => menu.classList.add("hidden"));
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
