# dsh-opencode-go-usage

[English](README.en.md) | 中文

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

![横排 chip（默认布局）](assets/chip-inline.png)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **bundle**，在 Web 界面的输入框上方 dock（与内置 token 统计同位置）显示 [OpenCode Go](https://opencode.ai/docs/go/) 订阅用量。

它是 [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage)（Pi 插件）的 Web 对应物：三个用量窗口（5h 滚动 / 每周 / 每月）的百分比与重置倒计时，按阈值变色，让你在窗口耗尽、请求被限流之前就发现。

```
OpenCode Go: 🕔 0% (2h 39m) · 7️⃣ 31% (2d 15h) · 🈷️ 62% (15d 18h) · ⏳ 2.4%/天 · upd 16:10
```

竖排（点 chip 上的图标按钮切换，选择会被记住）：

![竖排 chip（卡片布局）](assets/chip-stacked.png)

```
⚡ Go: upd 16:10
🕔 0% (2h 39m)
7️⃣ 31% (2d 15h)
🈷️ 62% (15d 18h)
⏳ 2.4%/天
```

本仓库是 [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（MIT）的定制分支，在上游基础上增加了若干定制（见[与上游的差异](#与上游的差异)）。

## 特性

- **三个窗口** —— 5h 滚动 / 每周 / 每月 的百分比 + 重置倒计时，直接取自 OpenCode 官方用量接口，与官网显示的数字一致
- **颜色阈值** —— 正常 → 黄色警告（≥80%）→ 红色错误（≥90% 或已限流）
- **每日剩余** —— 按月窗口折算的 `⏳ x.x%/天`，告诉你接下来每天平均还能用多少（<3%/天 红色、<5%/天 黄色）
- **数据新鲜度** —— `upd HH:MM` 显示最近一次成功抓取时间
- **轻量轮询** —— 每 10s 轮询（切回标签页立即刷新）；host 端 300s 缓存（TTL 可配）+ 60s 失败冷却，不会频繁打扰 opencode.ai
- **Provider 感知** —— 仅当会话当前模型的 provider 名称包含 `opencode`（不区分大小写）时显示；每次轮询读取实时模型选择（`modelSelection` 会话投影，毫秒级、不联网），因此 `opencode-go`、`opencode-zen-go` 及未来 OpenCode 路由均会自动显示，切到不含 `opencode` 的 provider 后一个轮询周期内自动隐藏；provider 读不到时（会话尚未绑定、上游 API 变动）保持显示，不再静默隐藏
- **浮动 chip** —— chip 逐帧跟随输入框卡片（rAF）。位置以**锚点**记录：水平方向是「chip 左边 − 卡片左边」，垂直方向是「卡片顶边 − chip 底边」的间距。存间距而不是像素纵坐标，意味着 chip 自身变高变矮（切竖排、出现 `⏳` 行、进入错误态）或组件重新挂载后，落点都保持一致，不会再飘走；可按住拖拽微调、点锁形按钮固定（锚点与锁定状态持久化在 localStorage）
- **横/竖排切换** —— chip 上的图标按钮在「一行横排」与「竖排卡片」之间切换：竖排为 `⚡ Go: upd HH:MM` + 三个窗口各一行 + `⏳` 单独一行，操作图标移到末行右侧；竖排保持底边不动、向上生长，不会盖住输入框；选择持久化于 localStorage（`dsh.ocgoChip.layout`）
- **点击展开** —— 详情面板显示每个窗口的重置倒计时，左下角 `set` 可配置凭据，右侧 `refresh upd HH:MM` 手动刷新
- **内置凭据编辑器** —— 无需碰终端：`set` 面板直接修改服务账号 API Key、workspace id 与 cookie（输入框以 `••••` + 末尾 4 位显示，点击外部 / Esc / 保存确认写入）
- **零配置即可用** —— 若你的 DSH 已经配好 `opencode-go` provider（密钥在 `$DSH_HOME/.credentials.yaml` 的 `OPENCODE_GO_API_KEY`），插件会**自动复用同一把密钥**，不需要填写任何东西
- **优雅降级** —— 配置缺失显示 `<err:noconfig>`，认证失败显示 `<err:unauthorized>`，HTTP 失败显示 `<err:httpXXX>`；出错时点击 chip 直接进入 set 面板
- **凭据只在 host 侧** —— 浏览器只访问同源 `/api/ocgo-usage` JSON 端点，API Key 与 cookie 永不进入页面

> **✅ 推荐使用 OpenCode 服务账号 API Key。** 它在 OpenCode 控制台单独创建、可随时单独吊销，不随浏览器登录状态过期，且插件只把它用于读取用量。

> **⚠️ 旧版的会话 Cookie 仍兼容，但已不推荐。** `auth` cookie 是**完整的用户会话**（不是 API key），可访问你 OpenCode 账户的全部内容；且它失效时会静默导致取数失败。请优先用 API Key —— 见 [配置](#配置)。

## 与上游的差异

相对 [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（v0.1.0）的定制：

| 定制点 | 说明 |
|---|---|
| 取数改用官方接口 | 从「抓取 `/workspace/<wrk>/go` 页面并解析 DOM」改为调用官方用量接口 `GET /zen/go/v1/usage`（`Authorization: Bearer`），拿到结构化的 `{usage:{rolling,weekly,monthly}}`，不再依赖页面结构 |
| 服务账号 API Key 取代 Cookie | 默认凭据从会话 cookie 换成服务账号 API Key：只读、可单独吊销、不随浏览器登录过期；cookie 保留为回退路径（走 `/console/api/go/status` + `x-org-id`） |
| 零配置凭据发现 | 未显式配置时自动读取 `$DSH_HOME/.credentials.yaml` 中 `refs` 段的 `OPENCODE_GO_API_KEY`，即 DSH `opencode-go` provider 正在用的那把密钥 |
| chip 窗口标签图标化 | `5h / wk / mo` 文本标签改为 `🕔 / 7️⃣ / 🈷️` 图标（详情面板仍为完整文字） |
| chip 跟随输入框卡片 | 逐帧 rAF 钉在卡片上，位置以「水平偏移 + 底边间距」锚点记录（`dsh.ocgoChip.anchor`），chip 高度变化或组件重挂载后落点不变；拖拽移动、锁形按钮固定 |
| 每日剩余指标 | 按月窗口折算 `⏳ x.x%/天`，按 <3%/<5% 阈值变色（新增 `segOk` 样式） |
| OpenCode provider 通配 | 只要当前 provider 名称包含 `opencode`（不区分大小写）就展示 chip，支持 `opencode-zen-go` 及未来 OpenCode 路由 |
| 横/竖排切换 | chip 新增布局切换按钮：横排（默认，一行）或竖排卡片（`⚡ Go: upd HH:MM` + 三个窗口各一行 + `⏳` 一行，操作图标在末行右侧）；竖排按高度差补偿，保持底边不动向上生长；选择持久化于 `dsh.ocgoChip.layout` |
| 运行时依赖修复 | `@deepseek-ai/cordis` 移入 `dependencies`（link 安装时 npm 不自动装 peer 依赖导致启动失败的问题） |
| DSH 0.1.5 兼容修复 | 会话 provider 改从 `modelSelection` 会话投影读取（旧 `connection.api.sessions.models` RPC 已在 DSH 0.1.5 移除，旧写法会让 chip 静默消失）；provider 读不到时不再隐藏 chip |

## 环境要求

- DeepSeek Harness `0.1.5-rc.1` 或更新（web profile）—— provider 读取依赖 `modelSelection` 会话投影，旧的 `connection.api.sessions.models` RPC 已在 0.1.5 移除
- `PATH` 上有 pnpm（`dsh plugin` 需要）

## 安装

这是一个标准的 dsh **bundle**：`package.json` 声明了 `dsh.bundle`，通过 `dsh plugin --profile web add <spec>` 安装（pnpm 转发器），自动加入 profile 的 `dsh.profile.bundles`。仓库内置预构建的 `lib/` 产物，**安装无需任何构建步骤或构建权限**——遵循官方 [publish 指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:ZIYE-JK/dsh-opencode-go-usage
```

因为 `lib/` 已提交到仓库，pnpm 直接安装构建好的包，不会要求构建脚本授权。

### 从 tarball 安装

```sh
pnpm pack            # 在本仓库内 → dsh-ocgo-usage-0.2.0.tgz
dsh plugin --profile web add ./dsh-ocgo-usage-0.2.0.tgz
```

### 本地开发安装

```sh
git clone https://github.com/ZIYE-JK/dsh-opencode-go-usage.git
cd dsh-opencode-go-usage
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

### 方式零：什么都不配（推荐先试这个）

如果你的 DSH 已经配置了 `opencode-go` provider，密钥就存放于 `$DSH_HOME/.credentials.yaml` 的 `refs.OPENCODE_GO_API_KEY`。插件会**自动读取并复用**这把密钥，装完重启即可直接出数。

### 方式一：界面内 set 面板

点击 chip 展开详情 → 左下角 `set` → 填写服务账号 API Key（也可填 workspace id；旧 cookie 方式仍可在此录入）（已设置的值以 `••••` + 末尾 4 位显示，聚焦即可输入新值）→ 点击外部 / Esc / 保存按钮确认，立即生效。

![Set editor](assets/set-cookie-wid.png)

### 方式二：环境变量

```sh
export OPENCODE_GO_API_KEY="oc_sk_..."      # 推荐：服务账号 API Key
export OPENCODE_GO_WORKSPACE_ID="wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"   # 可选
```

旧方式（不推荐，仅作回退）：

```sh
export OPENCODE_GO_COOKIE="auth=Fe26.2*...; oc_locale=zh"
```

### 方式三：配置文件

写入 `$DSH_HOME/ocgo-usage.json`（默认 `~/.dsh/ocgo-usage.json`）：

```jsonc
{
  "apiKey": "oc_sk_...",
  "workspaceID": "wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

```sh
chmod 600 ~/.dsh/ocgo-usage.json
```

优先级：环境变量 > 配置文件 > `$DSH_HOME/.credentials.yaml` > 内置默认。

### 可选覆盖项

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API 基础地址（用量端点为 `<baseUrl>/zen/go/v1/usage`） |
| `OPENCODE_GO_CACHE_TTL` | `300` | host 缓存秒数，范围 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP 超时 |

组合层配置（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: ocgo-usage
  config:
    enabled: false    # 总开关，默认 true
```

> **凭据失效时：** 若 API Key 被吊销或写错，chip 显示 `<err:unauthorized>`；若用旧 cookie 且会话已过期，同样会报认证失败。点 chip 进入 set 面板换上新值即可。
>
> 历史提示：0.1.x 抓取的页面 `/workspace/<wrk>/go` 已被 opencode.ai 下线，现在会 302 跳转到控制台登录页，这正是旧版本 chip 显示 `error 302` 的原因；0.2.0 起改用官方接口后不再受影响。

## 使用

点击 chip 展开详情面板：每个窗口显示完整名称、百分比与重置倒计时；右下角 `refresh upd HH:MM` 手动刷新并显示数据时间。

![Usage detail](assets/usage-detail.png)

## 工作原理

- **Host 半**（`src/index.ts`、`src/service.ts`、`src/api.ts`、`src/routes.ts`）—— 优先用**官方用量接口**取数：

  ```
  GET {baseUrl}/zen/go/v1/usage
  Authorization: Bearer <OPENCODE_GO_API_KEY>
  User-Agent: dsh-ocgo-usage (...)
  ```

  响应为 `{"usage":{"rolling":{"status","percent","resetsAt"}, "weekly":{...}, "monthly":{...}}}`：`percent` 是**已用**比例（0–100），`resetsAt` 是 ISO 时间戳，host 侧换算成重置倒计时。注意必须显式设置 `User-Agent`，否则 Cloudflare 会以 `Error 1010` 直接 403。

  未配置 API Key 时回退到旧路径：带 cookie 请求 `/console/api/go/status`（并附加 `x-org-id`），把微美分字符串额度换算成百分比。结果缓存后通过同源 JSON 端点 `/api/ocgo-usage`（+ `/api/ocgo-usage/refresh`、`/api/ocgo-usage/config`）提供数据。
- **浏览器半**（`src/client/`）—— 向 `conversation.composer.dock` slot 注册 chip，每 10s 轮询 host 端点，按严重级别着色渲染三个窗口；当 `modelSelection` 会话投影中的实时 provider 名称包含 `opencode`（不区分大小写）时显示（读不到 provider 时保持显示，不静默隐藏）；chip 位置由 `src/client/OcgoDockEntry.tsx` 中的 rAF 跟随逻辑逐帧钉在输入框卡片上（锚点模型）；chip 支持横排/竖排两种布局（持久化于 `dsh.ocgoChip.layout`），竖排为 5 行卡片、操作图标位于末行右侧。

浏览器永远看不到 API Key 与 cookie；取数与解析全部在 host 侧完成。

## 安全

- 插件只需要**读取用量**。推荐使用 OpenCode **服务账号 API Key**（控制台可单独创建与吊销，不随浏览器会话过期）。
- 旧版 `auth` cookie 是**完整的 OpenCode 用户会话**。任何人拿到它都能访问你账户内的所有 workspace、订阅与账单信息 —— 因此仅在不得已时使用，并优先迁移到 API Key。
- 插件**绝不**记录 API Key 与 cookie、不把它们放进错误信息、不发送给浏览器。
- 配置编辑器只把新值写入 `$DSH_HOME/ocgo-usage.json`（chmod 600），浏览器始终只看到 `••••` + 末尾 4 位的掩码视图。

## 开发

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run（官方接口解析 / 控制台解析 / 配置与凭据发现 / 取数路由 / 缓存服务）
```

> **改 client 端后无需重启 dsh web：** host 实时从磁盘读取 `/plugins/dsh-ocgo-usage/client.js`，改完刷新浏览器页面即可；改 host 端（`src/index.ts` 等）则需重启。

构建配置（`shared/tsdown.client.ts`）改编自 [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter)（BSD-3-Clause），后者是官方 DSH `packages/client/tsdown.client.ts` 的副本——它产出 web shell 模块表所需的 `window.__ModuleLoader__.load({id, factory})` 闭包工厂产物。

## 更新日志

### 0.2.0

- **改用官方 Go 用量接口** `GET /zen/go/v1/usage`（`Authorization: Bearer`）。0.1.x 抓取的 `/workspace/<wrk>/go` 页面已被 opencode.ai 下线并 302 跳转到登录页，这是旧的 `error 302` 根因。
- **服务账号 API Key 取代会话 Cookie** 作为默认凭据；cookie 保留为回退路径（`/console/api/go/status` + `x-org-id`）。
- **零配置凭据发现**：自动复用 `$DSH_HOME/.credentials.yaml` 中的 `OPENCODE_GO_API_KEY`。
- **chip 定位改为锚点模型**（`dsh.ocgoChip.anchor`）：重挂载、切会话、切布局后不再飘走。旧的 `dsh.ocgoChip.offset` 会自动迁移。
- 新增/重写单元测试，覆盖两个端点的解析、错误分层、凭据优先级与取数路由（共 70 个用例）。

## 致谢

- 上游：[v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)（MIT）—— 本仓库的全部基础功能来自它
- [v587d/pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) —— Pi 平台上的同源插件，行为基准

## License

MIT —— 见 [LICENSE](./LICENSE)。