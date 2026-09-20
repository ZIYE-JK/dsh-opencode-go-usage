# dsh-opencode-go-usage

English | [中文](README.md)

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

![Inline chip (default layout)](assets/chip-inline.png)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) **bundle** that shows your [OpenCode Go](https://opencode.ai/docs/go/) subscription usage in the composer dock above the input bar (same spot as the built-in token stats).

It is the Web counterpart of [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) (a Pi plugin): percentage and reset countdown for the three usage windows (rolling 5h / weekly / monthly), color-coded by threshold, so you notice before a window runs out and requests get rate-limited.

```
OpenCode Go: 🕔 0% (2h 39m) · 7️⃣ 31% (2d 15h) · 🈷️ 62% (15d 18h) · ⏳ 2.4%/day · upd 16:10
```

Stacked layout (toggle it with the icon button on the chip; the choice is remembered):

![Stacked chip (card layout)](assets/chip-stacked.png)

```
⚡ Go: upd 16:10
🕔 0% (2h 39m)
7️⃣ 31% (2d 15h)
🈷️ 62% (15d 18h)
⏳ 2.4%/day
```

This repository is a customized fork of [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage) (MIT). See [Differences from upstream](#differences-from-upstream).

## Features

- **Three windows** — rolling 5h / weekly / monthly percentage + reset countdown, taken straight from OpenCode's official usage API, matching the numbers shown in the console
- **Color thresholds** — normal → yellow warning (≥80%) → red error (≥90% or rate-limited)
- **Daily remaining** — `⏳ x.x%/day` derived from the monthly window, telling you the average you can spend per day (red <3%/day, yellow <5%/day)
- **Freshness** — `upd HH:MM` shows the last successful fetch time
- **Light polling** — polls every 10s (instant refresh when the tab regains focus); host-side 300s cache (configurable TTL) + 60s failure cooldown, so opencode.ai is not bothered too often
- **Provider-aware** — shown whenever the session's current model provider name contains `opencode` (case-insensitive); reads the live in-memory model selection (the `modelSelection` session projection, millisecond-fresh, no network) each poll, so `opencode-go`, `opencode-zen-go`, and future OpenCode routes appear automatically, while a provider without `opencode` hides within one poll interval; an unreadable provider (session not bound yet, upstream API drift) keeps the chip visible instead of hiding it
- **Floating chip** — the chip follows the composer input card frame-by-frame (rAF). Its place is stored as an **anchor**: horizontally "chip left − card left", vertically the gap "card top − chip bottom". Storing the gap instead of a pixel y means the resting position survives the chip growing or shrinking (stacked layout, the `⏳` line appearing, an error state) and survives a remount. Drag it to fine-tune, click the lock button to pin it (anchor and lock state persist in localStorage)
- **Inline / stacked layouts** — the icon button on the chip toggles between the single inline line and a stacked card: `⚡ Go: upd HH:MM`, one line per window, then the `⏳` daily line, with the action icons moved to the last line; the stacked card keeps its bottom edge fixed and grows upward, so it never covers the composer. The choice persists in localStorage (`dsh.ocgoChip.layout`)
- **Click to expand** — the detail panel shows each window's reset countdown, a `set` editor for credentials at the bottom-left, and a manual `refresh upd HH:MM` at the right
- **Built-in credential editor** — no terminal needed: the `set` panel edits the service-account API key, the workspace id and the cookie directly (inputs show `••••` + last 4 chars; click outside / Esc / Save confirms the write)
- **Works with zero configuration** — if your DSH already has the `opencode-go` provider configured (its key lives in `$DSH_HOME/.credentials.yaml` under `OPENCODE_GO_API_KEY`), the plugin reuses that exact key without you typing anything
- **Graceful degradation** — missing config shows `<err:noconfig>`, authentication failures show `<err:unauthorized>`, HTTP failures show `<err:httpXXX>`; clicking the chip in the error state opens the set panel directly
- **Credentials stay host-side** — the browser only talks to the same-origin `/api/ocgo-usage` JSON endpoints; the API key and cookie never reach the page

> **✅ A service-account API key is the recommended credential.** Create one in the OpenCode console; it is read-only for this plugin, revocable on its own, and does not expire with your browser session.

> **⚠️ The legacy session cookie still works but is deprecated.** The `auth` cookie is a **full user session** (not an API key) and can access everything in your OpenCode account; when it lapses, fetching fails silently. Prefer an API key — see [Configuration](#configuration).

## Differences from upstream

Relative to [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage) (v0.1.0):

| Change | Description |
|---|---|
| Official API instead of page scraping | Fetching switched from scraping `/workspace/<wrk>/go` and parsing its DOM to the official usage API `GET /zen/go/v1/usage` (`Authorization: Bearer`), which returns structured `{usage:{rolling,weekly,monthly}}` data and no longer depends on page markup |
| Service-account API key replaces the cookie | The default credential is now a service-account API key: read-only, individually revocable, and unaffected by browser login expiry; the cookie remains as a fallback path (`/console/api/go/status` + `x-org-id`) |
| Zero-config credential discovery | With no explicit configuration, the plugin reads `OPENCODE_GO_API_KEY` from the `refs` block of `$DSH_HOME/.credentials.yaml` — the very key DSH's `opencode-go` provider uses |
| Iconized window labels | `5h / wk / mo` text labels replaced with `🕔 / 7️⃣ / 🈷️` icons (the detail panel keeps full text) |
| Chip follows the input card | A rAF loop pins the chip to the card, storing its place as an anchor ("horizontal offset + bottom gap", `dsh.ocgoChip.anchor`) so the resting position survives chip height changes and remounts; drag to move, lock button to pin |
| Daily remaining metric | `⏳ x.x%/day` derived from the monthly window, color-coded at <3%/<5% thresholds (new `segOk` style) |
| OpenCode provider wildcard | Shows the chip whenever the current provider name contains `opencode` (case-insensitive), covering `opencode-zen-go` and future OpenCode routes |
| Inline / stacked layouts | A layout toggle button on the chip switches between the inline line (default) and a stacked card (`⚡ Go: upd HH:MM` + one line per window + the `⏳` line, action icons on the last line); the stacked card is height-compensated so its bottom edge stays put while it grows upward; the choice persists under `dsh.ocgoChip.layout` |
| Runtime dependency fix | `@deepseek-ai/cordis` moved into `dependencies` (npm does not auto-install peer deps for `link:` installs, which previously broke startup) |
| DSH 0.1.5 compatibility fix | The session provider is now read from the `modelSelection` session projection (the old `connection.api.sessions.models` RPC was removed in DSH 0.1.5 and made the chip vanish silently); an unreadable provider no longer hides the chip |

## Requirements

- DeepSeek Harness `0.1.5-rc.1` or newer (web profile) — the provider read uses the `modelSelection` session projection; the old `connection.api.sessions.models` RPC was removed in 0.1.5
- `pnpm` on `PATH` (needed by `dsh plugin`)

## Installation

This is a standard dsh **bundle**: `package.json` declares `dsh.bundle` and it is installed via `dsh plugin --profile web add <spec>` (pnpm transformer), which adds it to the profile's `dsh.profile.bundles`. The repository ships prebuilt `lib/` artifacts, so **no build step or build permission is required** — following the official [publish guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md).

### From GitHub (recommended)

```sh
dsh plugin --profile web add github:ZIYE-JK/dsh-opencode-go-usage
```

Because `lib/` is committed to the repository, pnpm installs the built package directly without asking for build-script permission.

### From tarball

```sh
pnpm pack            # inside this repo → dsh-ocgo-usage-0.2.0.tgz
dsh plugin --profile web add ./dsh-ocgo-usage-0.2.0.tgz
```

### Local development install

```sh
git clone https://github.com/ZIYE-JK/dsh-opencode-go-usage.git
cd dsh-opencode-go-usage
pnpm install
pnpm run build
dsh plugin --profile web add link:$(pwd)
```

**Restart `dsh web` and refresh the page** — the chip appears in the dock above the input bar. You can verify the plugin layer composes without starting:

```sh
dsh --profile web --dump-config   # should show a "# == dsh-ocgo-usage" layer
```

> **About the npm name:** the npm package name `dsh-ocgo-usage` (used by this plugin and its upstream) was squatted by a third-party plugin with similar functionality, so this repo is not published to npm; GitHub install is unaffected. If you see a same-named npm package elsewhere, it is not the artifact of this repository.

## Configuration

### Option 0: configure nothing (try this first)

If your DSH already has the `opencode-go` provider configured, its key lives in `$DSH_HOME/.credentials.yaml` under `refs.OPENCODE_GO_API_KEY`. The plugin picks it up automatically — install, restart, and it works.

### Option 1: the in-UI `set` panel

Click the chip to expand → `set` at the bottom-left → enter the service-account API key (the workspace id, and the legacy cookie, can also be entered here). Existing values show as `••••` + last 4 chars; focus the input to type a new value → click outside / Esc / Save to confirm; it takes effect immediately.

![Set editor](assets/set-cookie-wid.png)

### Option 2: environment variables

```sh
export OPENCODE_GO_API_KEY="oc_sk_..."      # recommended: service-account API key
export OPENCODE_GO_WORKSPACE_ID="wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"   # optional
```

Legacy (deprecated, fallback only):

```sh
export OPENCODE_GO_COOKIE="auth=Fe26.2*...; oc_locale=zh"
```

### Option 3: config file

Write `$DSH_HOME/ocgo-usage.json` (default `~/.dsh/ocgo-usage.json`):

```jsonc
{
  "apiKey": "oc_sk_...",
  "workspaceID": "wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

```sh
chmod 600 ~/.dsh/ocgo-usage.json
```

Precedence: environment variables > config file > `$DSH_HOME/.credentials.yaml` > built-in defaults.

### Optional overrides

| Env var | Default | Description |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API base URL (the usage endpoint is `<baseUrl>/zen/go/v1/usage`) |
| `OPENCODE_GO_CACHE_TTL` | `300` | host cache seconds, range 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP timeout |

Layer config (`~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- id: ocgo-usage
  config:
    enabled: false    # master switch, default true
```

> **When a credential goes bad:** a revoked or mistyped API key shows `<err:unauthorized>`; an expired legacy cookie fails authentication the same way. Click the chip and enter a new value in the set panel.
>
> Historical note: the page scraped by 0.1.x (`/workspace/<wrk>/go`) was retired by opencode.ai and now 302-redirects to the console login page — that was the cause of the old `error 302` chip. Since 0.2.0 the plugin uses the official API and is unaffected.

## Usage

Click the chip to expand the detail panel: each window shows its full name, percentage and reset countdown; `refresh upd HH:MM` at the bottom-right refreshes manually and shows the data time.

![Usage detail](assets/usage-detail.png)

## How it works

- **Host half** (`src/index.ts`, `src/service.ts`, `src/api.ts`, `src/routes.ts`) — reads usage through the **official usage API** first:

  ```
  GET {baseUrl}/zen/go/v1/usage
  Authorization: Bearer <OPENCODE_GO_API_KEY>
  User-Agent: dsh-ocgo-usage (...)
  ```

  The response is `{"usage":{"rolling":{"status","percent","resetsAt"}, "weekly":{...}, "monthly":{...}}}`: `percent` is the **used** share (0–100) and `resetsAt` is an ISO instant, which the host turns into a reset countdown. A `User-Agent` must be set explicitly — without one Cloudflare rejects the request with `Error 1010` (403).

  With no API key configured it falls back to the legacy path: a cookie-authenticated `GET /console/api/go/status` (plus `x-org-id`), converting micro-cent meter strings into percentages. The result is cached and served through the same-origin JSON endpoints `/api/ocgo-usage` (+ `/api/ocgo-usage/refresh`, `/api/ocgo-usage/config`).
- **Browser half** (`src/client/`) — registers the chip on the `conversation.composer.dock` slot, polls the host endpoint every 10s, and renders the three windows color-coded by severity. It is visible when the live provider in the `modelSelection` session projection contains `opencode` (case-insensitive); an unreadable provider keeps the chip visible instead of hiding it; the chip position is pinned to the input card frame-by-frame by the rAF follower in `src/client/OcgoDockEntry.tsx` (anchor model). The chip has two layouts (inline and stacked, persisted under `dsh.ocgoChip.layout`); the stacked one is a five-line card with the action icons on its last line.

The browser never sees the API key or the cookie; fetching and parsing all happen host-side.

## Security

- The plugin only needs to **read usage**. Prefer an OpenCode **service-account API key** (created and revoked independently in the console, unaffected by browser session expiry).
- The legacy `auth` cookie is a **full OpenCode user session**. Anyone holding it can access every workspace, subscription and billing detail in your account — use it only if you must, and migrate to an API key.
- The plugin **never** logs the API key or the cookie, never puts them into error messages, never sends them to the browser.
- The config editor only writes new values to `$DSH_HOME/ocgo-usage.json` (chmod 600); the browser only ever sees the `••••` + last-4-chars masked view.

## Development

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run (Go API parser / console parser / config + credential discovery / fetch routing / cached service)
```

> **Client changes need no dsh web restart:** the host reads `/plugins/dsh-ocgo-usage/client.js` from disk live, so a browser refresh suffices after editing client code; host-side changes (`src/index.ts` etc.) require a restart.

The build config (`shared/tsdown.client.ts`) is adapted from [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter) (BSD-3-Clause), itself a copy of the official DSH `packages/client/tsdown.client.ts` — it produces the closure-factory artifacts that the web shell's module table (`window.__ModuleLoader__.load({id, factory})`) requires.

## Changelog

### 0.2.0

- **Switched to the official Go usage API** `GET /zen/go/v1/usage` (`Authorization: Bearer`). The `/workspace/<wrk>/go` page scraped by 0.1.x was retired by opencode.ai and now 302-redirects to the login page — the root cause of the old `error 302`.
- **A service-account API key replaces the session cookie** as the default credential; the cookie remains as a fallback path (`/console/api/go/status` + `x-org-id`).
- **Zero-config credential discovery**: reuses `OPENCODE_GO_API_KEY` from `$DSH_HOME/.credentials.yaml`.
- **The chip now anchors by gap** (`dsh.ocgoChip.anchor`) instead of a pixel offset, so it no longer drifts after a remount, a session switch or a layout toggle. The legacy `dsh.ocgoChip.offset` key is migrated automatically.
- New/rewritten unit tests covering both endpoint parsers, error layering, credential precedence and fetch routing (70 cases in total).

## Credits

- Upstream: [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage) (MIT) — all base functionality of this repo comes from it
- [v587d/pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) — the same plugin on the Pi platform, the behavioral baseline

## License

MIT — see [LICENSE](./LICENSE).