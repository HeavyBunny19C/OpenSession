import { escapeHtml } from "../markdown.mjs";
import { layout } from "./layout.mjs";
import { t } from "../i18n.mjs";

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function renderLineChart(data, width = 600, height = 200) {
  if (!data || data.length === 0) return '<svg width="600" height="200"><text x="300" y="100" text-anchor="middle" fill="var(--text-secondary)">No data</text></svg>';
  
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  
  const maxTokens = Math.max(...data.map(d => d.total_tokens || 0), 1);
  
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((d.total_tokens || 0) / maxTokens) * innerHeight;
    return `${x},${y}`;
  });
  
  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${padding.left + innerWidth},${padding.top + innerHeight} L ${padding.left},${padding.top + innerHeight} Z`;
  
  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * innerHeight;
    const val = maxTokens - (i / 4) * maxTokens;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" />`;
    gridLines += `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text-secondary)">${formatNumber(val)}</text>`;
  }
  
  let xLabels = '';
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    xLabels += `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${data[i].day.substring(5)}</text>`;
  }
  if (data.length > 1) {
    const lastX = padding.left + innerWidth;
    xLabels += `<text x="${lastX}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${data[data.length - 1].day.substring(5)}</text>`;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
      <defs>
        <linearGradient id="gradient-line" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.3" />
          <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaData}" fill="url(#gradient-line)" />
      <path d="${pathData}" fill="none" stroke="var(--accent-color)" stroke-width="2" />
      ${points.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="var(--accent-color)" />`).join('')}
      ${xLabels}
    </svg>
  `;
}

function renderPieChart(data, width = 300, height = 300) {
  if (!data || data.length === 0) return '<svg width="300" height="300"><text x="150" y="150" text-anchor="middle" fill="var(--text-secondary)">No data</text></svg>';
  
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 20;
  
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);
  if (total === 0) return '<svg width="300" height="300"><text x="150" y="150" text-anchor="middle" fill="var(--text-secondary)">No data</text></svg>';
  
  let currentAngle = 0;
  let paths = '';
  let legend = '';
  
  data.forEach((d, i) => {
    const sliceAngle = ((d.count || 0) / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(currentAngle);
    const y1 = cy + radius * Math.sin(currentAngle);
    const x2 = cx + radius * Math.cos(currentAngle + sliceAngle);
    const y2 = cy + radius * Math.sin(currentAngle + sliceAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const color = colors[i % colors.length];
    
    if (data.length === 1) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity="0.85" />`;
    } else {
      paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.85" />`;
    }
    
    const pct = ((d.count / total) * 100).toFixed(1);
    legend += `<div class="legend-item"><span class="legend-color" style="background:${color}"></span><span class="legend-label">${escapeHtml(d.model || "unknown")} — ${formatNumber(d.count)} (${pct}%)</span></div>`;
    currentAngle += sliceAngle;
  });

  return `
    <div class="pie-chart-container">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">${paths}</svg>
      <div class="legend">${legend}</div>
    </div>
  `;
}

function renderBarChart(data, width = 600, height = 200) {
  if (!data || data.length === 0) return '<svg width="600" height="200"><text x="300" y="100" text-anchor="middle" fill="var(--text-secondary)">No data</text></svg>';
  
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  
  const maxCount = Math.max(...data.map(d => d.count || 0), 1);
  const barWidth = Math.max(4, (innerWidth / data.length) - 2);
  
  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * innerHeight;
    const val = maxCount - (i / 4) * maxCount;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" />`;
    gridLines += `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text-secondary)">${Math.round(val)}</text>`;
  }
  
  const bars = data.map((d, i) => {
    const x = padding.left + (i / data.length) * innerWidth + 1;
    const barHeight = ((d.count || 0) / maxCount) * innerHeight;
    const y = padding.top + innerHeight - barHeight;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--accent-color)" opacity="0.75" rx="2" />`;
  }).join('');

  let xLabels = '';
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const x = padding.left + (i / data.length) * innerWidth + barWidth / 2;
    xLabels += `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${data[i].day.substring(5)}</text>`;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
      ${gridLines}
      ${bars}
      ${xLabels}
    </svg>
  `;
}

export function renderStatsPage(data) {
  const { tokenStats, modelDistribution, dailySessions, overview, provider, providers } = data;
  const totalSessions = overview?.totalSessions ?? 0;
  const totalMessages = overview?.totalMessages ?? 0;
  const totalTokens = tokenStats && tokenStats.length > 0
    ? tokenStats.reduce((s, d) => s + (d.total_tokens || 0), 0)
    : 0;

  // Find peak day
  let peakDay = '';
  let peakTokens = 0;
  if (tokenStats && tokenStats.length > 0) {
    for (const d of tokenStats) {
      if ((d.total_tokens || 0) > peakTokens) {
        peakTokens = d.total_tokens || 0;
        peakDay = d.day || '';
      }
    }
  }

  const avgTokens = tokenStats && tokenStats.length > 0
    ? Math.round(tokenStats.reduce((s, d) => s + (d.total_tokens || 0), 0) / tokenStats.length)
    : 0;

  const content = `
    <div class="stats-page">
      <!-- Breadcrumb -->
      <div class="stats-breadcrumb">
        <span class="stats-prompt">$pwd:</span>
        <ol class="stats-breadcrumb-list">
          <li><a href="/${provider || ''}">~</a></li>
          <li>/</li>
          <li>stats</li>
        </ol>
      </div>

      <!-- Command header -->
      <div class="stats-cmd">$ token-stats --days=30 --verbose</div>

      <!-- Title -->
      <h1 class="stats-title">&gt; ${t("stats.title")}</h1>
      <p class="stats-desc">// ${t("stats.desc")}</p>

      <!-- Info box -->
      <div class="stats-info-box">
        <div class="stats-info-header">
          <span class="dash-file">README.md</span>
        </div>
        <div class="stats-info-body">
          <h2>## ${t("stats.about_title")}</h2>
          <p>[INFO] ${t("stats.about_desc")}</p>
        </div>
      </div>

      <!-- Summary stats row -->
      <div class="stats-summary-row">
        <div class="stats-summary-card">
          <div class="stats-summary-label">${t("stats.total_sessions")}</div>
          <div class="stats-summary-value">${formatNumber(totalSessions)}</div>
        </div>
        <div class="stats-summary-card">
          <div class="stats-summary-label">${t("stats.total_messages")}</div>
          <div class="stats-summary-value">${formatNumber(totalMessages)}</div>
        </div>
        <div class="stats-summary-card">
          <div class="stats-summary-label">${t("stats.token_usage")}</div>
          <div class="stats-summary-value">${formatNumber(totalTokens)}</div>
        </div>
        <div class="stats-summary-card">
          <div class="stats-summary-label">${t("stats.avg_daily")}</div>
          <div class="stats-summary-value">${formatNumber(avgTokens)}</div>
        </div>
        <div class="stats-summary-card">
          <div class="stats-summary-label">${t("stats.peak_day")}</div>
          <div class="stats-summary-value">${formatNumber(peakTokens)}</div>
          ${peakDay ? `<div class="stats-summary-sub">@ ${peakDay}</div>` : ''}
        </div>
      </div>

      <!-- Token Trend Chart -->
      <section class="stats-chart-section">
        <div class="stats-chart-cmd">$ plot token-trend.data</div>
        <h2 class="stats-chart-title">${t("stats.token_trend")}</h2>
        <div class="stats-chart-body">
          ${renderLineChart(tokenStats)}
        </div>
      </section>

      <!-- Model Distribution Chart -->
      <section class="stats-chart-section">
        <div class="stats-chart-cmd">$ plot models.data --type=pie</div>
        <h2 class="stats-chart-title">${t("stats.model_distribution")}</h2>
        <div class="stats-chart-body">
          ${renderPieChart(modelDistribution)}
        </div>
      </section>

      <!-- Daily Sessions Chart -->
      <section class="stats-chart-section">
        <div class="stats-chart-cmd">$ plot sessions.data --type=bar</div>
        <h2 class="stats-chart-title">${t("stats.daily_sessions")}</h2>
        <div class="stats-chart-body">
          ${renderBarChart(dailySessions)}
        </div>
      </section>
    </div>
  `;
  
  return layout(t("stats.title"), content, "stats", { provider, providers });
}
