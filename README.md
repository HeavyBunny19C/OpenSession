<p align="center">
  <img src="./docs/preview-dashboard.png" alt="oh-my-opensession" width="720" />
</p>

<h1 align="center">✨ oh-my-opensession ✨</h1>

<p align="center">
  <strong>🖥️ 你和 AI 结对编程的「回忆录」—— 终端风格的 <a href="https://opencode.ai">OpenCode</a> 会话浏览器</strong>
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

<p align="center">
  <em>每一次和 AI 的对话都值得被好好收藏 📖</em><br/>
  <em>就像翻看和老朋友的聊天记录，只不过这个朋友会写代码 🤖</em>
</p>

---

## 🤔 这是什么？

你有没有想过——

> 「上周那个 bug 我是怎么让 Claude 帮我修的来着？」
> 「上个月写的那个正则表达式，AI 给的方案贼优雅，在哪呢？」
> 「我到底烧了多少 token？💸」

**oh-my-opensession** 就是来解决这些问题的。它是一个本地 Web 应用，帮你浏览、搜索、管理所有 OpenCode 会话——带暗色模式、终端美学、还有一点点极客浪漫 🌙

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
<summary><strong>🗂️ 批量管理 — 断舍离，从会话开始</strong></summary>
<br/>
<p align="center">
  <img src="./docs/preview-batch-manage.png" alt="Batch Management" width="720" />
</p>
</details>

---

## 🚀 三秒启动

```bash
npx oh-my-opensession
```

> 💡 打开 `http://localhost:3456`，开始考古你的 AI 编程之旅！

想常驻？

```bash
npm install -g oh-my-opensession
oh-my-opensession --open  # 自动弹浏览器，懒人福音
```

---

## ✨ 能干啥？

| | 功能 | 一句话说明 |
|:---:|:---|:---|
| 🌙 | **暗色模式** | 自动跟随系统，深夜 coding 不刺眼 |
| 🖥️ | **终端美学** | 代码块卡片 + 网格背景，看着就想写代码 |
| 🔍 | **搜索 & 筛选** | 按关键词、时间范围快速定位，告别大海捞针 |
| ♾️ | **无限滚动** | 丝滑加载，不用翻页翻到手酸 |
| ⭐ | **收藏** | 给重要会话打个星，下次一秒找到 |
| ✏️ | **重命名** | 「untitled-session-47」？不存在的 |
| 🗑️ | **软删除** | 手滑删错？回收站救你 |
| 📤 | **导出** | Markdown / JSON 一键导出，写博客素材有了 |
| 📊 | **Token 统计** | 消耗趋势、模型分布，钱花哪了一目了然 |
| 🔔 | **Toast 通知** | 操作有反馈，不再对着屏幕发呆 |
| 🗂️ | **批量操作** | 多选收藏/删除，效率拉满 |
| 🌐 | **中英双语** | `--lang zh` 切中文，`--lang en` 切英文 |
| 🔒 | **只读安全** | 绝不碰你的 OpenCode 数据库，放心用 |
| 📦 | **零依赖** | 只要 Node.js，没有 node_modules 黑洞 |

---

## 🛠️ 环境要求

- **Node.js** >= 22.5.0（用了内置的 `node:sqlite`，所以版本要求高一丢丢）
- 装了 [OpenCode](https://opencode.ai) 并且有会话数据（没数据也能跑，就是空空如也 😅）
- macOS / Windows x64

## ⚙️ 命令行选项

```
选项                    说明                          默认值
--port <端口号>         服务端口                       3456
--db <路径>            opencode.db 路径               自动检测
--lang <en|zh>         界面语言                       自动检测
--open                 启动后自动弹浏览器              false
-h, --help             显示帮助                       —
```

## 🔧 环境变量

| 变量 | 说明 |
|:---|:---|
| `PORT` | 服务端口（`--port` 优先） |
| `SESSION_VIEWER_DB_PATH` | opencode.db 路径（`--db` 优先） |
| `OH_MY_OPENSESSION_META_PATH` | 元数据库路径 |

---

## 🧠 工作原理

```
┌─────────────────────────────────────────┐
│  OpenCode DB (只读)                      │
│  └── session / message / part / todo    │
└──────────────┬──────────────────────────┘
               │ SELECT（绝不 INSERT/UPDATE）
               ▼
┌─────────────────────────────────────────┐
│  oh-my-opensession                      │
│  ├── 服务端渲染 HTML                     │
│  ├── 无限滚动 API                        │
│  └── 管理操作 → meta.db (独立存储)        │
└──────────────┬──────────────────────────┘
               │ http://localhost:3456
               ▼
┌─────────────────────────────────────────┐
│  🌙 你的浏览器                           │
│  └── 暗色模式 / 终端美学 / Toast 通知     │
└─────────────────────────────────────────┘
```

你的 OpenCode 数据 **绝对安全**——我们只看不摸。收藏、重命名、删除等操作存在独立的 `meta.db` 里：

```
macOS:   ~/.config/oh-my-opensession/meta.db
Windows: %APPDATA%\oh-my-opensession\meta.db
```

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
