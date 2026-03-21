# Agent/Skill/MCP/Tool/LSP Visualization Design

**Date**: 2026-03-21
**Status**: Draft — pending review
**Scope**: Session detail page trace visualization for OpenCode provider

---

## 1. Context & Decisions

### 1.1 Background

OpenSession v1.0 stores AI session data from multiple providers. The OpenCode provider's SQLite DB already contains rich execution trace data — agent info, skill calls, MCP server interactions, tool executions, reasoning blocks, and step boundaries — but none of this is surfaced in the UI. Users want to see the AI's thinking chain and execution flow visually.

### 1.2 Key Decisions (User-Confirmed)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Provider scope | OpenCode only (v1), other providers later |
| 2 | View type | Waterfall timeline (primary) + Node graph (per-step) |
| 3 | Entry point | Side panel in session detail page — click tool call → panel slides out |
| 4 | Rendering library | Cytoscape.js via CDN for node graph; pure CSS/SVG for waterfall |
| 5 | Data source | Existing OpenCode DB `part.data` — no schema changes needed |

---

## 2. Data Available in OpenCode DB

### 2.1 Message-Level Fields

The `message.data` JSON contains fields not currently extracted by the adapter:

```javascript
{
  role: "assistant",
  parentID: "msg_xxx",       // Message hierarchy
  modelID: "claude-opus-4-6",
  providerID: "anthropic",
  agent: { /* agent metadata */ },
  mode: "...",
  path: "...",
  cost: 0.218,
  tokens: { total: 34147, input: 3, output: 269, reasoning: 0, cache: { read: 0, write: 33875 } },
  time: { created: 1774025117447, completed: 1774025127347 },
  finish: "..."
}
```

### 2.2 Part Types (Execution Trace)

The `part.data` JSON has these types, forming natural span boundaries:

| Part Type | Fields | Maps To |
|-----------|--------|---------|
| `step-start` | `{ type }` | Span open |
| `reasoning` | `{ type, text, metadata, time: { start, end } }` | Thinking block |
| `text` | `{ type, text, time: { start, end } }` | Text output |
| `tool` | `{ type, callID, tool, state: { status, input, output, title, metadata, time } }` | Tool/Skill/MCP call |
| `step-finish` | `{ type, reason, cost, tokens }` | Span close with metrics |

### 2.3 Tool Name Classification

The `tool` field in tool parts directly reveals the operation type:

| Pattern | Category | Examples |
|---------|----------|----------|
| `"skill"` | Skill invocation | Loading brainstorming, writing-plans, etc. |
| `"{mcp}_{method}"` | MCP Server call | `nocturne-memory_read_memory`, `openviking_search` |
| `"read"`, `"write"`, `"edit"`, `"bash"` | Built-in tool | File operations, shell |
| `"grep"`, `"glob"`, `"ast_grep_search"` | Built-in tool | Search tools |
| `"lsp_diagnostics"`, `"lsp_goto_definition"` | LSP operation | Language server |
| `"task"` | Agent delegation | Subagent dispatch |
| `"invalid"` | Failed call | Tool name mismatch |

Classification logic:
```javascript
function classifyTool(toolName) {
  if (toolName === "skill") return "skill";
  if (toolName === "task") return "agent";
  if (toolName === "invalid") return "invalid";
  if (toolName.startsWith("lsp_")) return "lsp";
  if (toolName.includes("_") && !["ast_grep", "web_search"].some(p => toolName.startsWith(p))) return "mcp";
  return "tool";
}
```

MCP server name extraction:
```javascript
function extractMcpServer(toolName) {
  // "nocturne-memory_read_memory" → { server: "nocturne-memory", method: "read_memory" }
  const idx = toolName.indexOf("_");
  if (idx === -1) return null;
  return { server: toolName.slice(0, idx), method: toolName.slice(idx + 1) };
}
```

---

## 3. Architecture

### 3.1 Data Flow

```
OpenCode DB (part.data)
    ↓ adapter extracts step-start/step-finish/tool/reasoning/text
Step[] (structured trace data)
    ↓ API endpoint serves to client
Client JS
    ↓ renders
Waterfall (CSS) + Cytoscape.js (DAG)
```

### 3.2 New Data Structures

```javascript
/**
 * A single execution step (between step-start and step-finish).
 * @typedef {Object} TraceStep
 * @property {number} index - Step number (1-based)
 * @property {number} startTime - Unix ms
 * @property {number} endTime - Unix ms
 * @property {number} duration - ms
 * @property {number} cost - USD
 * @property {object} tokens - { total, input, output, reasoning, cache }
 * @property {string} finishReason - "tool-calls" | "end_turn" | etc.
 * @property {TraceNode[]} nodes - Ordered list of operations in this step
 */

/**
 * A single operation within a step.
 * @typedef {Object} TraceNode
 * @property {string} id - Part ID
 * @property {"reasoning"|"text"|"skill"|"mcp"|"tool"|"lsp"|"agent"|"invalid"} category
 * @property {string} label - Display name
 * @property {string|null} toolName - Raw tool name from DB
 * @property {string|null} mcpServer - Extracted MCP server name
 * @property {string|null} mcpMethod - Extracted MCP method name
 * @property {number} startOffset - ms from step start
 * @property {number} duration - ms
 * @property {"completed"|"error"|"running"|null} status
 * @property {object|null} input - Tool input (truncated for display)
 * @property {object|null} output - Tool output (truncated for display)
 */
```

### 3.3 File Structure

| File | Responsibility |
|------|---------------|
| `src/providers/opencode/trace.mjs` | Extract TraceStep[] from DB parts for a session |
| `src/views/trace-panel.mjs` | Server-render the trace panel HTML shell |
| `src/static/trace.js` | Client-side: waterfall rendering, Cytoscape graph, panel interactions |
| `src/static/trace.css` | Trace panel styles (waterfall bars, panel layout, node detail) |

### 3.4 Integration Points

**Server-side** (`src/server.mjs`):
- New API: `GET /api/:provider/session/:id/trace` → returns `{ steps: TraceStep[] }`
- Only implemented for OpenCode; other providers return `{ steps: [] }`

**Session detail page** (`src/views/session.mjs`):
- Add empty `<div id="trace-panel" class="trace-panel closed">` to page
- Add `data-part-id` attributes to tool call message cards
- Load `trace.js` and `trace.css`

**Client-side** (`src/static/trace.js`):
- On page load: fetch `/api/:provider/session/:id/trace`
- On tool call card click: open panel, render waterfall + graph for that step
- Panel close button: slide panel closed

---

## 4. UI Design

### 4.1 Session Detail Page Changes

Current layout:
```
┌─────────────────────────────────────────────┐
│ Sidebar (sessions)  │  Session Detail        │
└─────────────────────────────────────────────┘
```

New layout (when panel open):
```
┌──────────────────────────────────────────────────────┐
│ Sidebar │  Session Detail        │  Trace Panel      │
│         │  (messages)            │  (420px)           │
│         │                        │  ┌──────────────┐ │
│         │  [user msg]            │  │ Timeline tab  │ │
│         │  [step-start]          │  │ ──────────── │ │
│         │  [tool: skill] ←click  │  │ waterfall    │ │
│         │  [tool: mcp]           │  │ bars here    │ │
│         │  [text output]         │  │              │ │
│         │  [step-finish]         │  │ Graph tab    │ │
│         │                        │  │ ──────────── │ │
│         │                        │  │ cytoscape    │ │
│         │                        │  │ DAG here     │ │
│         │                        │  └──────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 4.2 Trace Panel Structure

```html
<div class="trace-panel closed" id="trace-panel">
  <div class="trace-panel-header">
    <h3 id="trace-title">Step N Trace</h3>
    <button class="trace-close">✕</button>
  </div>
  <div class="trace-tabs">
    <button class="trace-tab active" data-view="timeline">⏱ Timeline</button>
    <button class="trace-tab" data-view="graph">🔮 Graph</button>
  </div>
  <div class="trace-content">
    <div id="trace-timeline"><!-- waterfall rows --></div>
    <div id="trace-graph" style="display:none">
      <div id="cy"></div>
      <div id="node-detail"></div>
    </div>
  </div>
</div>
```

### 4.3 Waterfall Timeline

Each TraceNode renders as a horizontal bar:
- X-axis: time offset from step start
- Bar width: proportional to duration
- Bar color: category-based (reasoning=purple, skill=orange, MCP=green, tool=cyan, LSP=blue, invalid=gray, error=red border)
- Left label: tool name / category
- Right label: duration in ms

Summary row at bottom shows: total duration, cost, token count, category legend.

### 4.4 Node Graph (Cytoscape.js)

Layout: `breadthfirst` (top-down directed graph)
Nodes: Start → [TraceNodes in order] → End
Edges: Sequential flow (start → first node → second node → ... → end)
Node shape: `round-rectangle` for operations, `ellipse` for start/end
Node color: Same category-based palette as waterfall
Interaction: Click node → show detail card below graph (input/output/timing)
Features: Zoom, pan, fit-to-screen

### 4.5 Color Palette

| Category | Color | Hex |
|----------|-------|-----|
| reasoning | Purple (dim) | `#6366f1` opacity 0.6 |
| skill | Orange | `#f59e0b` |
| mcp | Green | `#10b981` |
| tool | Cyan | `#06b6d4` |
| lsp | Blue | `#3b82f6` |
| agent | Pink | `#ec4899` |
| text | Violet | `#8b5cf6` |
| invalid | Gray | `#64748b` opacity 0.5 |
| error | Red border | `#ef4444` |

---

## 5. API Design

### 5.1 Trace Endpoint

```
GET /api/:provider/session/:id/trace
```

Response:
```json
{
  "sessionId": "ses_xxx",
  "provider": "opencode",
  "steps": [
    {
      "index": 1,
      "startTime": 1774025127249,
      "endTime": 1774025127350,
      "duration": 101,
      "cost": 0.218,
      "tokens": { "total": 34147, "input": 3, "output": 269 },
      "finishReason": "tool-calls",
      "nodes": [
        {
          "id": "prt_xxx",
          "category": "reasoning",
          "label": "thinking",
          "toolName": null,
          "mcpServer": null,
          "mcpMethod": null,
          "startOffset": 0,
          "duration": 8,
          "status": null,
          "input": null,
          "output": null
        },
        {
          "id": "prt_yyy",
          "category": "skill",
          "label": "writing-plans",
          "toolName": "skill",
          "mcpServer": null,
          "mcpMethod": null,
          "startOffset": 21,
          "duration": 63,
          "status": "error",
          "input": { "name": "superpowers/writing-plans" },
          "output": null
        },
        {
          "id": "prt_zzz",
          "category": "mcp",
          "label": "nocturne:read_memory",
          "toolName": "nocturne-memory_read_memory",
          "mcpServer": "nocturne-memory",
          "mcpMethod": "read_memory",
          "startOffset": 30,
          "duration": 94,
          "status": "completed",
          "input": { "uri": "system://boot" },
          "output": "(truncated)"
        }
      ]
    }
  ]
}
```

Non-OpenCode providers return `{ steps: [] }`.

---

## 6. Adapter Changes

### 6.1 New Module: `src/providers/opencode/trace.mjs`

Reads raw parts from DB, groups by step-start/step-finish boundaries, classifies each tool part, returns `TraceStep[]`.

Does NOT modify the existing adapter interface — this is a separate module called directly by the trace API route.

### 6.2 No Interface Changes

The `ProviderAdapter` interface stays unchanged. The trace feature is OpenCode-specific in v1. If other providers want traces later, a `getTrace(sessionId)` method can be added to the interface.

---

## 7. External Dependencies

| Dependency | Version | Size | Delivery | Purpose |
|-----------|---------|------|----------|---------|
| Cytoscape.js | 3.30.x | ~170KB min | CDN `<script>` | Node graph rendering, zoom/pan/click |

Loaded via CDN `<script>` tag, same pattern as highlight.js already in the project. No npm dependency added.

---

## 8. What's NOT in v1

- Cross-provider traces (only OpenCode)
- Parallel branch visualization (parts are shown sequentially)
- Live/streaming trace updates
- Trace search/filter
- Trace export
- Aggregated trace statistics across sessions
- `getTrace()` method on ProviderAdapter interface

---

## 9. Success Criteria

1. Session detail page: clicking any tool call message opens the trace panel
2. Timeline tab shows waterfall with correct timing and color-coded categories
3. Graph tab shows Cytoscape DAG with zoom/pan/click-for-detail
4. Panel can be opened/closed without page reload
5. Categories correctly classified: skill, MCP (with server name), tool, LSP, agent, reasoning
6. Step cost and token count displayed in summary
7. Works with dark theme (existing CSS variables)
8. No new npm dependencies (Cytoscape via CDN only)
9. Other providers gracefully return empty trace (no errors)
