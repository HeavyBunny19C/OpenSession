<p align="center">
  <img src="./docs/preview-dashboard.png" alt="oh-my-opensession" width="720" />
</p>

<h1 align="center">OpenSession</h1>

<p align="center">
  <strong>开发者的 AI 编年史 — 把散落四处的对话日记，装订成册</strong>
</p>

<p align="center">
  <a href="./README.en.md">English</a> · <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/dependencies-0-blue?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat-square" alt="Version" />
</p>

<p align="center">
  <em>人类写日记记录生活，程序员的日记写在和 AI 的对话里。</em><br/>
  <em>问题是——你的日记散落在四个不同的抽屉，你确定还找得到？</em>
</p>

---

## 🤔 这是什么？

我们可能是历史上第一代，**跟 AI 聊天比跟同事聊天还多**的人。

想想看——每天你把最复杂的架构决策、最刁钻的 debug 推理、最灵光一闪的设计直觉，全都倾倒在和 AI 的对话里。这些对话比你写过的任何代码注释都诚实（毕竟你不会在注释里写「我其实看不懂三天前自己写的代码」），比你开过的任何 standup 都有信息量，比你发过的任何周报都接近你真实的工作状态。

**你的 AI 对话记录，就是这个时代最真实的工作日志。**

只不过这本日记散落在四个不同的笔记本里——OpenCode 的 SQLite、Claude Code 的 JSONL、Codex 的 JSON、Gemini 的临时目录。四种格式，四个角落，像极了你那个永远不会整理的「稍后阅读」书签文件夹。

**OpenSession 做的事很简单：把这四本散落的日记收回来，装订成册。**

搜索、浏览、收藏、导出、统计——暗色模式、终端美学、零依赖。还能帮你算算到底烧了多少 token（这个数字建议做好心理准备再看 💸）。

---

## 🔌 支持的 AI 编程工具

| 工具 | 状态 | 会话来源 |
|:---|:---:|:---|
| [OpenCode](https://opencode.ai) | ✅ 完整支持 | `~/.local/share/opencode/opencode.db` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | ✅ 完整支持 | `~/.claude/projects/` |
| [Codex CLI](https://github.com/openai/codex) | ✅ 完整支持 | `~/.codex/sessions/` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | ✅ 完整支持 | `~/.gemini/tmp/` |

> 自动检测已安装的工具，未安装的会在顶栏灰显。无需手动配置。

---

## 🎬 预览

<details open>
<summary><strong>🏠 首页仪表盘 — 终端风格，程序员的浪漫</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-dashboard.png" alt="Dashboard" width="720" />
</p>
</details>

<details>
<summary><strong>💬 会话详情 — 和 AI 的每一次「深夜长谈」</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-session-detail.png" alt="Session Detail" width="720" />
</p>
<p align="center">
  <img src="./docs/preview-session-chat.png" alt="Session Chat" width="720" />
</p>
</details>

<details>
<summary><strong>📊 Token 统计 — 看看你的钱包还好吗</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-stats.png" alt="Stats" width="720" />
</p>
</details>

<details>
<summary><strong>🔮 Trace 可视化 — AI 的思考链路，一目了然</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-trace.png" alt="Trace Visualization" width="720" />
</p>
<p>Session 详情页右侧自动展开调用链路树，按时间顺序展示：</p>
<ul>
  <li>🤖 <strong>Agent</strong> — Sisyphus / Momus / Explorer / Librarian 等具名 Agent 委派</li>
  <li>🎯 <strong>Skill</strong> — writing-plans / brainstorming / TDD 等技能调用</li>
  <li>🧠 <strong>MCP</strong> — nocturne-memory / openviking / context7 等 MCP Server 交互</li>
  <li>🔧 <strong>Tool</strong> — read / write / edit / bash / grep 等内置工具</li>
  <li>📡 <strong>LSP</strong> — diagnostics / goto_definition 等语言服务操作</li>
</ul>
</details>

<details>
<summary><strong>🗂️ 批量管理 — 断舍离，从会话开始</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-batch-manage.png" alt="Batch Management" width="720" />
</p>
</details>

---

## 🚀 安装与启动

### 方式一：npx 一键运行（推荐）

```bash
npx opensession
```

> 打开 `http://localhost:3456`，开始考古你的 AI 编程之旅！

### 方式二：全局安装

```bash
npm install -g opensession
opensession --open  # 自动弹浏览器
```

### 方式三：从源码运行

```bash
git clone https://github.com/HeavyBunny19C/OpenSession.git
cd oh-my-opensession
npm start
```

---

## 🔄 升级

```bash
# npx 用户：自动使用最新版，无需操作

# 全局安装用户：
npm update -g opensession

# 源码用户：
git pull origin main
```

## 🗑️ 卸载

```bash
# 全局安装用户：
npm uninstall -g opensession

# 清理元数据（可选，收藏/重命名等数据）：
# macOS/Linux:
rm -rf ~/.config/oh-my-opensession
# Windows:
rd /s /q "%APPDATA%\oh-my-opensession"
```

---

## ✨ 能干啥？

| | 功能 | 一句话说明 |
|:---:|:---|:---|
| 🔌 | **多工具支持** | OpenCode / Claude Code / Codex CLI / Gemini CLI 一站式管理 |
| 🌙 | **暗色模式** | 自动跟随系统，深夜 coding 不刺眼 |
| 🖥️ | **终端美学** | 代码块卡片 + 网格背景，看着就想写代码 |
| 🔍 | **搜索 & 筛选** | 按关键词、时间范围快速定位，告别大海捞针 |
| ♾️ | **无限滚动** | 丝滑加载，不用翻页翻到手酸 |
| ⭐ | **收藏** | 给重要会话打个星，下次一秒找到 |
| ✏️ | **重命名** | 「untitled-session-47」？不存在的 |
| 🗑️ | **软删除** | 手滑删错？回收站救你 |
| 📤 | **导出** | Markdown / JSON 一键导出，写博客素材有了 |
| 📊 | **Token 统计** | 消耗趋势、模型分布，钱花哪了一目了然 |
| 🔮 | **Trace 可视化** | Agent/Skill/MCP/Tool/LSP 调用链路树，AI 的思考过程一览无余 |
| 🗂️ | **批量操作** | 多选收藏/删除，效率拉满 |
| 🌐 | **中英双语** | `--lang zh` 切中文，`--lang en` 切英文 |
| 🔒 | **只读安全** | 绝不碰你的原始数据，放心用 |
| 📦 | **零依赖** | 只要 Node.js，没有 node_modules 黑洞 |

---

## 🛠️ 环境要求

- **Node.js** >= 22.5.0（用了内置的 `node:sqlite`，所以版本要求高一丢丢）
- 至少安装了以下任一 AI 编程工具：OpenCode、Claude Code、Codex CLI、Gemini CLI

| 平台 | 架构 | 状态 |
|:---|:---|:---:|
| 🍎 macOS | x64 / Apple Silicon (arm64) | ✅ |
| 🪟 Windows | x64 / arm64 | ✅ |
| 🐧 Linux | x64 / arm64 | ✅ |

> 纯 JS，零 native 依赖，有 Node.js 就能跑 🏃

---

## ⚙️ 命令行选项

```
选项                        说明                                默认值
--port <端口号>             服务端口                             3456
--opencode-db <路径>        opencode.db 路径（别名: --db）        自动检测
--claude-dir <路径>         Claude Code 数据目录                  ~/.claude
--codex-dir <路径>          Codex CLI 会话目录                    ~/.codex/sessions
--gemini-dir <路径>         Gemini CLI 数据目录                   ~/.gemini/tmp
--reindex                   启动时强制重建所有索引                 false
--lang <en|zh>              界面语言                              自动检测
--open                      启动后自动弹浏览器                    false
-h, --help                  显示帮助                              —
```

## 🔧 环境变量

| 变量 | 说明 |
|:---|:---|
| `PORT` | 服务端口（`--port` 优先） |
| `SESSION_VIEWER_DB_PATH` | opencode.db 路径（`--db` 优先） |
| `OH_MY_OPENSESSION_META_PATH` | 元数据库路径 |

---

## 🏗️ 架构

```
src/
├── providers/           # Provider 适配器（插件式架构）
│   ├── interface.mjs    # 统一接口定义
│   ├── opencode/        # OpenCode 适配器（SQLite）
│   ├── claude-code/     # Claude Code 适配器（JSONL）
│   ├── codex/           # Codex CLI 适配器（JSON）
│   └── gemini/          # Gemini CLI 适配器（JSON）
├── views/               # 服务端渲染模板
├── static/              # 前端 CSS + JS
├── index-db.mjs         # 跨 Provider 会话索引
├── meta.mjs             # 元数据（收藏/重命名/删除）
├── server.mjs           # HTTP 路由
└── config.mjs           # 配置解析
```

### 添加新 Provider

参考 `docs/CONTRIBUTING-PROVIDERS.md`，实现 `ProviderAdapter` 接口即可接入新工具。

---

## 🐛 常见问题

<details>
<summary><strong>Q: 启动后看不到某个工具的会话？</strong></summary>

确认该工具已安装且有会话数据。OpenSession 会自动检测以下路径：
- OpenCode: `~/.local/share/opencode/opencode.db`
- Claude Code: `~/.claude/projects/`
- Codex CLI: `~/.codex/sessions/`
- Gemini CLI: `~/.gemini/tmp/`

如果路径不同，用对应的 `--xxx-dir` 参数指定。
</details>

<details>
<summary><strong>Q: 端口被占用？</strong></summary>

```bash
opensession --port 8080
```
</details>

<details>
<summary><strong>Q: 数据安全吗？</strong></summary>

完全安全。OpenSession 以只读方式访问 AI 工具的数据，收藏/重命名/删除等操作存储在独立的 `meta.db` 中（`~/.config/oh-my-opensession/meta.db`），绝不修改原始数据。
</details>

---

## 🤖 AI Agent 速查

<details>
<summary>点击展开（给 AI 助手看的）</summary>

```
PROJECT: oh-my-opensession (OpenSession)
TYPE: Multi-provider AI session viewer & manager
STACK: Node.js 22.5+, zero dependencies, ESM only, node:sqlite
ENTRY: bin/cli.mjs → src/server.mjs

PROVIDERS:
  opencode   — SQLite DB at ~/.local/share/opencode/opencode.db (read-only)
  claude-code — JSONL files at ~/.claude/projects/**/claude.jsonl
  codex      — JSON files at ~/.codex/sessions/*/session.json
  gemini     — JSON files at ~/.gemini/tmp/*/gemini_history_aistudio.json

ARCHITECTURE:
  src/providers/interface.mjs — ProviderAdapter interface
  src/providers/*/adapter.mjs — Per-provider implementation
  src/index-db.mjs — Cross-provider session index (SQLite)
  src/meta.mjs — User metadata: star, rename, soft-delete (SQLite)
  src/server.mjs — HTTP routing with /:provider prefix

KEY FACTS:
  - Read-only: Never modifies AI tool databases
  - Meta storage: ~/.config/oh-my-opensession/meta.db
  - Zero install: Clone and run, no npm install needed
  - ESM only: "type": "module", entry is bin/cli.mjs
  - No build step: Pure JavaScript, no bundler
```

</details>

---

## 🗺️ Roadmap

> v1.0 已完成多 Provider 架构，以下是已规划但尚未实现的特性。欢迎 PR 和 Issue！

**🔀 跨平台会话迁移 & 上下文注入**
- [ ] 跨 Provider 会话导出 / 导入（OpenCode ↔ Claude Code ↔ Codex ↔ Gemini）
- [ ] 打开会话时自动注入上下文到目标工具（一键在另一个 AI 工具中继续对话）
- [ ] `adapter.exportSession()` 已预埋接口，返回标准化消息 + 原始数据双格式

**🧠 会话知识图谱**
- [ ] 基于 `parentId` 的父子会话层级关系可视化（主任务 → 子任务 → 孙任务）
- [ ] 会话关联图：展示 session 之间的派生关系、分支、合并
- [ ] 项目维度聚合：按工作目录自动归组关联会话
- [ ] `RawSession.parentId` 已预埋，OpenCode 的 `parent_id` 和 Claude Code 的 `parentSessionId` 在 v1 已采集

**🔮 Agent / Skill / MCP / Tool / LSP 可视化**
- [x] 会话内调用链路树：展示 Agent 委派、Skill 触发、MCP Server 交互、Tool 执行、LSP 操作的完整思考链路
- [x] Agent 具名化
- [x] 按时间顺序排列，步骤可折叠，层级缩进（Agent → 子调用）
- [ ] 节点级耗时分析优化：瀑布时间线视图
- [ ] 思考链路回放：按时间线还原 AI 的决策过程

**🔌 跨 Provider 能力增强**
- [ ] 跨 Provider 统一搜索（当前各 tab 独立搜索）
- [ ] 跨 Provider 聚合统计面板
- [ ] 非 OpenCode Provider 的收藏 / 重命名 / 删除（当前仅 OpenCode 支持写操作）

**⚡ 数据 & 实时性**
- [ ] 实时文件监听（当前仅启动时索引 + 手动刷新）
- [ ] 增量索引（仅扫描新增/变更的会话文件）

**🧩 插件 & 扩展**
- [ ] 运行时动态 Provider 插件加载（当前为编译时注册）
- [ ] UI 内 Provider 设置面板（当前仅 CLI 参数 / 环境变量配置）
- [ ] 更多 Provider：Cursor / Windsurf / Aider

**架构预埋（已在 v1.0 中完成）**
- ✅ `RawSession.parentId` — 知识图谱父子关联字段
- ✅ `Message.metadata` — Agent/Skill/MCP/Tool/LSP 原始数据保留
- ✅ `adapter.getTrace()` — OpenCode Trace 数据提取（v1.1 已实现）
- ✅ `adapter.exportSession()` — 跨平台迁移导出接口存根
- ✅ `session_index` 复合主键 `(provider, session_id)` — 跨 Provider 数据隔离

---

## 💖 捐赠

如果这个项目让你会心一笑，欢迎请我喝杯蜜雪冰城 🍦

<p align="center">
  <img src="./docs/wechat-pay.jpeg" alt="微信支付" width="250" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./docs/alipay.jpeg" alt="支付宝" width="250" />
</p>
<p align="center">
  <sub>微信支付 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 支付宝</sub>
</p>

---

## 📄 许可证

MIT — 随便用，开心就好 🎉
