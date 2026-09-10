# dsh-opencode-go-usage

[English](README.en.md) | 中文

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

![Footer demo](assets/custom-footer.png)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **bundle**，在 Web 界面的输入框上方 dock（与内置 token 统计同位置）显示 [OpenCode Go](https://opencode.ai/docs/go/) 订阅用量。

它是 [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage)（Pi 插件）的 Web 对应物：三个用量窗口（5h 滚动 / 每周 / 每月）的百分比与重置倒计时，按阈值变色，让你在窗口耗尽、请求被限流之前就发现。

```
OpenCode Go: 🕔 0% (2h 39m) · 7️⃣ 31% (2d 15h) · 🈷️ 62% (15d 18h) · ⏳ 2.4%/天 · upd 16:10
```

本仓库是 [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（MIT）的定制分支，在上游基础上增加了三处定制（见[与上游的差异](#与上游的差异)）。

## 特性

- **三个窗口** —— 5h 滚动 / 每周 / 每月 的百分比 + 重置倒计时
- **颜色阈值** —— 正常 → 黄色警告（≥80%）→ 红色错误（≥90% 或已限流）
- **每日剩余** —— 按月窗口折算的 `⏳ x.x%/天`，告诉你接下来每天平均还能用多少（<3%/天 红色、<5%/天 黄色）
- **数据新鲜度** —— `upd HH:MM` 显示最近一次成功抓取时间
- **轻量轮询** —— 每 10s 轮询（切回标签页立即刷新）；host 端 300s 缓存（TTL 可配）+ 60s 失败冷却，不会频繁打扰 opencode.ai
- **Provider 感知** —— 仅当会话当前模型的 provider 名称包含 `opencode`（不区分大小写）时显示；每次轮询读取实时模型选择（`modelSelection` 会话投影，毫秒级、不联网），因此 `opencode-go`、`opencode-zen-go` 及未来 OpenCode 路由均会自动显示，切到不含 `opencode` 的 provider 后一个轮询周期内自动隐藏；provider 读不到时（会话尚未绑定、上游 API 变动）保持显示，不再静默隐藏
- **浮动 chip** —— chip 逐帧跟随输入框卡片（rAF），调整侧边栏宽度或滚动页面时始终与卡片保持固定像素偏移；可按住拖拽微调位置、点锁形按钮固定（位置与锁定状态持久化在 localStorage）
- **点击展开** —— 详情面板显示每个窗口的重置倒计时，左下角 `set` 可配置凭据，右侧 `refresh upd HH:MM` 手动刷新
- **内置凭据编辑器** —— 无需碰终端：`set` 面板直接修改 workspace id 与 cookie（输入框以 `••••` + 末尾 4 位显示，点击外部 / Esc / 保存确认写入）
- **优雅降级** —— 配置缺失显示 `<err:noconfig>`，HTTP 失败显示 `<err:httpXXX>`；出错时点击 chip 直接进入 set 面板
- **Cookie 只在 host 侧** —— 浏览器只访问同源 `/api/ocgo-usage` JSON 端点，cookie 永不进入页面

> **⚠️ 需要 OpenCode Go 会话 cookie。** 该 cookie 是完整用户会话（不是 API key），可访问你 OpenCode 账户的全部内容。请像对待密码一样对待它——见 [配置](#配置)。

## 与上游的差异

相对 [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（v0.1.0）的定制：

| 定制点 | 说明 |
|---|---|
| chip 窗口标签图标化 | `5h / wk / mo` 文本标签改为 `🕔 / 7️⃣ / 🈷️` 图标（详情面板仍为完整文字） |
| chip 跟随输入框卡片 | 逐帧 rAF 钉在卡片上（`position: fixed` 坐标 = 卡片位置 + 用户偏移），拖拽移动、锁形按钮固定；偏移持久化于 `dsh.ocgoChip.offset`（旧 `dsh.ocgoChip.pos` 一次性迁移） |
| 每日剩余指标 | 按月窗口折算 `⏳ x.x%/天`，按 <3%/<5% 阈值变色（新增 `segOk` 样式） |
| 当前 OpenCode 页面解析 | 兼容 `rollingUsage` / `weeklyUsage` / `monthlyUsage` 指向的 `$R[n]` 序列化对象，从 `usagePercent` 与 `resetInSec` 读取实时值；与旧 `data-slot` DOM 同时存在时，实时序列化值优先，避免旧壳层错误显示月度 100% |
| OpenCode provider 通配 | 只要当前 provider 名称包含 `opencode`（不区分大小写）就展示 chip，支持 `opencode-zen-go` 及未来 OpenCode 路由 |
| 运行时依赖修复 | `@deepseek-ai/cordis` 移入 `dependencies`（link 安装时 npm 不自动装 peer 依赖导致启动失败的问题） |
| DSH 0.1.5 兼容修复 | 会话 provider 改从 `modelSelection` 会话投影读取（旧 `connection.api.sessions.models` RPC 已在 DSH 0.1.5 移除，旧写法会让 chip 静默消失）；provider 读不到时不再隐藏 chip |

## 环境要求

- DeepSeek Harness `0.1.5-rc.1` 或更新（web profile）—— provider 读取依赖 `modelSelection` 会话投影，旧的 `connection.api.sessions.models` RPC 已在 0.1.5 移除
- `PATH` 上有 pnpm（`dsh plugin` 需要）

## 安装

这是一个标准的 dsh **bundle**：`package.json` 声明了 `dsh.bundle`，通过 `dsh plugin --profile web add <spec>` 安装（pnpm 转发器），自动加入 profile 的 `dsh.profile.bundles`。仓库内置预构建的 `lib/` 产物，**安装无需任何构建步骤或构建权限**——遵循官方 [publish 指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:ZIYE-JK/dsh-ocgo-usage
```

因为 `lib/` 已提交到仓库，pnpm 直接安装构建好的包，不会要求构建脚本授权。

### 从 tarball 安装

```sh
pnpm pack            # 在本仓库内 → dsh-ocgo-usage-0.1.1.tgz
dsh plugin --profile web add ./dsh-ocgo-usage-0.1.1.tgz
```

### 本地开发安装

```sh
git clone https://github.com/ZIYE-JK/dsh-ocgo-usage.git
cd dsh-ocgo-usage
pnpm install
pnpm run build
dsh plugin --profile web add link:$(pwd)
```

**重启 `dsh web` 并刷新页面**，chip 出现在输入框上方的 dock。不启动即可验证插件层已组合：

```sh
dsh --profile web --dump-config   # 应显示 "# == dsh-ocgo-usage" 层
```

> **关于 npm 包名：** 本插件（及上游）在 npm 上被同名包 `dsh-ocgo-usage` 抢先占用（一个功能类似的第三方插件），因此暂不发布 npm；GitHub 安装不受影响。若你在别处看到同名 npm 包，请注意它不是本仓库的发布产物。

## 配置

### 方式一：界面内 set 面板（最简单）

点击 chip 展开详情 → 左下角 `set` → 输入 workspace id 与 cookie（已设置的值以 `••••` + 末尾 4 位显示，聚焦即可输入新值）→ 点击外部 / Esc / 保存按钮确认，立即生效。

![Set editor](assets/set-cookie-wid.png)

### 方式二：环境变量（与 pi-ocgo-usage 同名）

```sh
export OPENCODE_GO_COOKIE="auth=Fe26.2*...; oc_locale=zh"
export OPENCODE_GO_WORKSPACE_ID="wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
```

### 方式三：配置文件

写入 `$DSH_HOME/ocgo-usage.json`（默认 `~/.dsh/ocgo-usage.json`）：

```jsonc
{
  "cookie": "auth=Fe26.2*...; oc_locale=zh",
  "workspaceID": "wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

```sh
chmod 600 ~/.dsh/ocgo-usage.json
```

优先级：环境变量 > 配置文件 > 内置默认。

### 可选覆盖项

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API 基础地址 |
| `OPENCODE_GO_CACHE_TTL` | `300` | host 缓存秒数，范围 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP 超时 |

组合层配置（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: ocgo-usage
  config:
    enabled: false    # 总开关，默认 true
```

> **Cookie 过期：** `auth` cookie 签发后有效期 1 年。过期（或被吊销）后页面 302 跳转到登录页，chip 显示 `<err:http302>` 而非过期数字。重新登录 opencode.ai 后，通过 set 面板更新 cookie 即可。

## 使用

点击 chip 展开详情面板：每个窗口显示完整名称、百分比与重置倒计时；右下角 `refresh upd HH:MM` 手动刷新并显示数据时间。

![Usage detail](assets/usage-detail.png)

## 工作原理

- **Host 半**（`src/index.ts`、`src/service.ts`、`src/api.ts`、`src/routes.ts`）—— 携带 cookie 抓取 `GET /workspace/<wrk>/go`；兼容旧 SSR `data-slot="usage-item"` 块，也兼容当前 `rollingUsage` / `weeklyUsage` / `monthlyUsage` → `$R[n]` 的序列化对象，读取其中的 `usagePercent` 与 `resetInSec`。两种格式同时存在时优先采用实时序列化值，避免旧 DOM 壳层误报月度 100%。结果缓存后通过同源 JSON 端点 `/api/ocgo-usage`（+ `/api/ocgo-usage/refresh`、`/api/ocgo-usage/config`）提供数据。
- **浏览器半**（`src/client/`）—— 向 `conversation.composer.dock` slot 注册 chip，每 10s 轮询 host 端点，按严重级别着色渲染三个窗口；当 `modelSelection` 会话投影中的实时 provider 名称包含 `opencode`（不区分大小写）时显示（读不到 provider 时保持显示，不静默隐藏）；chip 位置由 `src/client/OcgoDockEntry.tsx` 中的 rAF 跟随逻辑逐帧钉在输入框卡片上。

浏览器永远看不到 cookie；抓取与解析全部在 host 侧完成。

## 安全

- `auth` cookie 是**完整的 OpenCode 用户会话**。任何人拿到它都能访问你账户内的所有 workspace、订阅与账单信息。
- 插件**绝不**记录 cookie、不把它放进错误信息、不发送给浏览器。
- 配置编辑器只把新值写入 `$DSH_HOME/ocgo-usage.json`（chmod 600），浏览器始终只看到 `••••` + 末尾 4 位的掩码视图。

## 开发

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run（解析器 / 配置 / 服务）
```

> **改 client 端后无需重启 dsh web：** host 实时从磁盘读取 `/plugins/dsh-ocgo-usage/client.js`，改完刷新浏览器页面即可；改 host 端（`src/index.ts` 等）则需重启。

构建配置（`shared/tsdown.client.ts`）改编自 [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter)（BSD-3-Clause），后者是官方 DSH `packages/client/tsdown.client.ts` 的副本——它产出 web shell 模块表所需的 `window.__ModuleLoader__.load({id, factory})` 闭包工厂产物。

## 致谢

- 上游：[v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（MIT）—— 本仓库的全部基础功能来自它
- [v587d/pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) —— Pi 平台上的同源插件，行为基准

## License

MIT —— 见 [LICENSE](./LICENSE)。
