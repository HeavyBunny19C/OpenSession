<p align="center">
  <img src="./docs/preview-dashboard.png" alt="oh-my-opensession" width="720" />
</p>

<h1 align="center">✨ oh-my-opensession ✨</h1>

<p align="center">
  <strong>🖥️ 终端风格的 <a href="https://opencode.ai">OpenCode</a> 会话浏览器与管理工具</strong>
</p>

<p align="center">
  <a href="./README.en.md">English</a> · <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/dependencies-0-blue?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/version-0.2.0-orange?style=flat-square" alt="Version" />
</p>

---

## 🎬 预览

<details open>
<summary><strong>🏠 首页仪表盘 — 终端风格导航卡片</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-dashboard.png" alt="Dashboard" width="720" />
</p>
</details>

<details>
<summary><strong>💬 会话详情 — 消息浏览 & 任务清单</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-session-detail.png" alt="Session Detail" width="720" />
</p>
<p align="center">
  <img src="./docs/preview-session-chat.png" alt="Session Chat" width="720" />
</p>
</details>

<details>
<summary><strong>📊 Token 统计 — 模型分布 & 趋势图表</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-stats.png" alt="Stats" width="720" />
</p>
</details>

<details>
<summary><strong>🗂️ 批量管理 — 多选操作 & 时间筛选</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-batch-manage.png" alt="Batch Management" width="720" />
</p>
</details>

---

## 🚀 快速开始

```bash
npx oh-my-opensession
```

> 💡 在 `http://localhost:3456` 打开 Web 界面，即刻开始浏览你的 AI 编程会话！

## 📦 安装

```bash
npm install -g oh-my-opensession
oh-my-opensession
```

---

## ✨ 功能特性

| 功能 | 描述 |
|:---:|:---|
| 🌙 | **暗色模式** — 自动检测系统偏好，一键切换明暗主题 |
| 🖥️ | **终端美学** — 代码块风格仪表盘卡片，微妙网格背景 |
| 📋 | **会话浏览** — 搜索、筛选、无限滚动浏览所有会话 |
| ⭐ | **收藏管理** — 收藏/取消收藏，快速定位重要会话 |
| ✏️ | **自定义标题** — 给会话起个好记的名字 |
| 🗑️ | **软删除** — 误删不怕，回收站随时恢复 |
| 📤 | **导出** — 一键导出为 Markdown 或 JSON |
| 📊 | **Token 统计** — 消耗趋势、模型分布、每日会话数 |
| 🔔 | **Toast 通知** — 所有操作即时视觉反馈 |
| 🗂️ | **批量操作** — 多选收藏、删除，效率翻倍 |
| 🌐 | **中英双语** — `--lang zh\|en` 自由切换 |
| 🔒 | **只读安全** — 绝不写入 OpenCode 数据库 |
| 📦 | **零依赖** — 只需 Node.js，开箱即用 |

---

## 🛠️ 环境要求

- **Node.js** >= 22.5.0（使用内置 `node:sqlite`）
- 已安装 [OpenCode](https://opencode.ai) 并有会话数据
- 支持平台：macOS、Windows x64

## ⚙️ 命令行选项

```
选项                    说明                          默认值
--port <端口号>         服务端口                       3456
--db <路径>            opencode.db 路径               自动检测
--lang <en|zh>         界面语言                       自动检测系统 LANG
--open                 启动后自动打开浏览器             false
-h, --help             显示帮助                       —
```

## 🔧 环境变量

| 变量 | 说明 |
|:---|:---|
| `PORT` | 服务端口（被 `--port` 覆盖） |
| `SESSION_VIEWER_DB_PATH` | opencode.db 路径（被 `--db` 覆盖） |
| `OH_MY_OPENSESSION_META_PATH` | 元数据库路径 |

---

## 🧠 工作原理

oh-my-opensession 以 **只读模式** 读取 OpenCode 的 SQLite 数据库来展示会话，绝不写入你的 OpenCode 数据。

管理元数据（收藏、重命名、软删除）存储在独立的 `meta.db` 中：

```
macOS:   ~/.config/oh-my-opensession/meta.db
Windows: %APPDATA%\oh-my-opensession\meta.db
```

---

## 💖 捐赠

如果这个项目对你有帮助，欢迎请我喝杯蜜雪 :)

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

MIT
