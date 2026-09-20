import { a as loadConfig, c as normalizeCookie, i as credentialsFilePath, l as readCredentialsRef, o as maskedConfigView, r as configFilePath, s as normalizeApiKey, u as writeConfigFile } from "./config-BvJydWDi.js";
import { Service } from "@deepseek-ai/cordis";
//#region src/routes.ts
/** Browser-facing base path of the usage API. */
const OCGO_API_PREFIX = "/api/ocgo-usage";
/** Write one JSON response. */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
	if (req.method === method) return true;
	json(res, 405, {
		ok: false,
		error: "method-not-allowed"
	});
	return false;
}
/** Read a bounded JSON request body. */
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 65536) {
				reject(/* @__PURE__ */ new Error("body-too-large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			if (raw.length === 0) {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(raw));
			} catch {
				reject(/* @__PURE__ */ new Error("bad-json"));
			}
		});
		req.on("error", reject);
	});
}
/** Wrap one async usage read as a GET JSON route. */
function getRoute(path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res, "GET")) return;
			Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
				json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/**
* The config editor routes: GET the masked view, POST new values to write.
* A successful write invalidates the usage cache so the next poll re-queries
* with the fresh cookie/workspace immediately (bypassing any cooldown).
*/
function makeConfigRoutes(service) {
	const read = () => maskedConfigView();
	const write = async (req) => {
		const body = await readJsonBody(req);
		const partial = {};
		if ("apiKey" in body) partial.apiKey = typeof body.apiKey === "string" ? body.apiKey : null;
		if ("cookie" in body) partial.cookie = typeof body.cookie === "string" ? body.cookie : null;
		if ("workspaceID" in body) partial.workspaceID = typeof body.workspaceID === "string" ? body.workspaceID : null;
		const view = writeConfigFile(partial);
		service.invalidateCache();
		return view;
	};
	return [{
		kind: "exact",
		path: `${OCGO_API_PREFIX}/config`,
		handler: (req, res) => {
			if (req.method === "GET") {
				Promise.resolve(read()).then((value) => json(res, 200, value), (error) => {
					json(res, 500, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				});
				return;
			}
			if (req.method === "POST") {
				Promise.resolve(write(req)).then((value) => json(res, 200, value), (error) => {
					json(res, 400, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				});
				return;
			}
			json(res, 405, {
				ok: false,
				error: "method-not-allowed"
			});
		}
	}];
}
/** Build the full usage API route family for one service. */
function makeOcgoRoutes(service) {
	return [
		getRoute(OCGO_API_PREFIX, () => service.view()),
		getRoute(`${OCGO_API_PREFIX}/refresh`, () => service.refresh()),
		...makeConfigRoutes(service)
	];
}
//#endregion
//#region src/api.ts
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
var UsageError = class extends Error {
	code;
	name = "UsageError";
	constructor(message, code) {
		super(message);
		this.code = code;
	}
};
/**
* GET a usage endpoint. Never throws on a non-2xx status — the caller maps the
* status onto a user-facing error so `401` can be told apart from a genuine
* transport failure.
*/
async function getJson(url, headers, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			method: "GET",
			headers,
			signal: controller.signal
		});
		const text = await res.text();
		let json;
		if (text.length > 0) try {
			json = JSON.parse(text);
		} catch {
			json = void 0;
		}
		return {
			status: res.status,
			json,
			text
		};
	} catch (e) {
		if (e instanceof Error && e.name === "AbortError") throw new UsageError(`Request timed out after ${timeoutMs}ms`, "timeout");
		throw new UsageError(String(e instanceof Error ? e.message : e), "fetch");
	} finally {
		clearTimeout(timer);
	}
}
/** Strip query params from a URL for safe error messages. */
function sanitizeUrl(url) {
	try {
		const u = new URL(url);
		return `${u.protocol}//${u.host}${u.pathname}`;
	} catch {
		return url;
	}
}
/**
* Identify this client upstream.
*
* A custom User-Agent is REQUIRED, not cosmetic: the default Python/urllib
* style UA is rejected by Cloudflare with `Error 1010: Access denied` (403).
* Kept version-neutral so a release bump never has to touch this file.
*/
const USER_AGENT = "dsh-ocgo-usage (+https://github.com/ZIYE-JK/dsh-ocgo-usage)";
/** Path of the documented Go usage endpoint, relative to the base URL. */
const GO_USAGE_PATH = "/zen/go/v1/usage";
/**
* Read usage through the documented Go usage API with a service-account key.
* Throws UsageError on any failure.
*/
async function fetchViaApiKey(cfg) {
	const apiKey = cfg.apiKey;
	if (apiKey === void 0 || apiKey.length === 0) throw new UsageError("未配置 OpenCode 服务账号 API Key", "noconfig");
	const url = `${cfg.baseUrl.replace(/\/+$/, "")}${GO_USAGE_PATH}`;
	const res = await getJson(url, {
		Authorization: `Bearer ${apiKey}`,
		Accept: "application/json",
		"User-Agent": USER_AGENT
	}, cfg.timeoutMs);
	if (res.status === 401 || res.status === 403) throw new UsageError("认证失败：OpenCode 服务账号 API Key 无效或已被撤销", "unauthorized");
	if (res.status !== 200) throw new UsageError(upstreamMessage(res) ?? `HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`);
	if (res.json === void 0) throw new UsageError("Go usage API returned a non-JSON body", "badjson");
	return fromGoUsage(res.json, Date.now());
}
/**
* Map a `/zen/go/v1/usage` payload onto the normalized usage shape.
*
* Accepts both the documented `{ usage: { rolling, weekly, monthly } }`
* envelope and a bare window object, mirroring the upstream's tolerance.
*/
function fromGoUsage(body, nowMs) {
	const root = asRecord(body);
	if (root === void 0) throw new UsageError("Go usage API returned no object", "badjson");
	const envelope = root.error;
	if (envelope !== void 0) {
		const error = asRecord(envelope);
		const type = typeof error?.type === "string" ? error.type : "api";
		throw new UsageError(typeof error?.message === "string" ? error.message : "OpenCode 返回了错误", type);
	}
	const windows = asRecord(root.usage) ?? root;
	const rolling = windowOf("rolling", windows.rolling, nowMs);
	const weekly = windowOf("weekly", windows.weekly, nowMs);
	const monthly = windowOf("monthly", windows.monthly, nowMs);
	if (rolling === void 0 && weekly === void 0 && monthly === void 0) throw new UsageError("Go usage API 返回了无法识别的额度结构", "empty");
	return {
		...rolling === void 0 ? {} : { rolling },
		...weekly === void 0 ? {} : { weekly },
		...monthly === void 0 ? {} : { monthly }
	};
}
/** Build one window from the documented `{ status, percent, resetsAt }` shape. */
function windowOf(kind, raw, nowMs) {
	const w = asRecord(raw);
	if (w === void 0) return void 0;
	const percent = clampPercent(asNumber(w.percent) ?? 0);
	const apiStatus = w.status;
	return {
		kind,
		percent,
		resetInSec: secondsUntil(w.resetsAt, nowMs),
		status: apiStatus === "rate-limited" || percent >= 100 ? "rate-limited" : "ok"
	};
}
/** Pull a human message out of an in-band upstream error body, if any. */
function upstreamMessage(res) {
	const root = asRecord(res.json);
	const message = asRecord(root?.error)?.message;
	if (typeof message === "string" && message.length > 0) return message;
	const rootMessage = root?.message;
	return typeof rootMessage === "string" && rootMessage.length > 0 ? rootMessage : void 0;
}
/** Path of the console SPA usage endpoint, relative to the base URL. */
const CONSOLE_GO_STATUS_PATH = "/console/api/go/status";
/**
* Read usage through the console JSON API with the session cookie.
* Throws UsageError on any failure.
*/
async function fetchViaCookie(cfg) {
	const cookie = cfg.cookie;
	if (cookie === void 0 || cookie.length === 0) throw new UsageError("未配置 OpenCode Cookie", "noconfig");
	const url = `${cfg.baseUrl.replace(/\/+$/, "")}${CONSOLE_GO_STATUS_PATH}`;
	const headers = {
		Cookie: cookie,
		Accept: "application/json",
		"User-Agent": USER_AGENT
	};
	if (cfg.workspaceID) headers["x-org-id"] = cfg.workspaceID;
	const res = await getJson(url, headers, cfg.timeoutMs);
	if (res.status === 401 || res.status === 403) throw new UsageError("登录已过期：请在 opencode.ai 控制台重新登录，然后更新 Cookie（更推荐改用服务账号 API Key）", "unauthorized");
	if (res.status !== 200) throw new UsageError(`HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`);
	if (res.json === void 0) throw new UsageError("Console usage API returned a non-JSON body", "badjson");
	return fromGoStatus(asRecord(res.json), Date.now());
}
/**
* Map a `/console/api/go/status` payload onto the normalized usage shape.
*
* Meters report `limitMicroCents` / `usedMicroCents` as decimal STRINGS; the
* monthly meter carries no `resetsAt`, so its reset comes from `access.endsAt`.
*/
function fromGoStatus(root, nowMs) {
	if (root === void 0) throw new UsageError("Console usage API returned no object", "badjson");
	const tag = root._tag;
	if (typeof tag === "string" && tag.length > 0) {
		if (tag === "OrgRequired") throw new UsageError("缺少组织上下文：workspaceID 未配置或无效", "org-required");
		throw new UsageError(`OpenCode 返回错误：${tag}`, "api");
	}
	const access = asRecord(root.access);
	if (access === void 0) throw new UsageError("该账号当前没有可用的 OpenCode Go 订阅", "noaccess");
	const meters = asRecord(access.meters);
	const rolling = meterWindow("rolling", meters?.fiveHour, nowMs);
	const weekly = meterWindow("weekly", meters?.week, nowMs);
	const monthly = meterWindow("monthly", meters?.month, nowMs, access.endsAt);
	return {
		...rolling === void 0 ? {} : { rolling },
		...weekly === void 0 ? {} : { weekly },
		...monthly === void 0 ? {} : { monthly }
	};
}
/**
* Build one usage window from a console meter object. `fallbackResetIso` is
* used when the meter has no `resetsAt` (monthly resets with the period).
*/
function meterWindow(kind, raw, nowMs, fallbackResetIso) {
	const meter = asRecord(raw);
	if (meter === void 0) return void 0;
	const percent = percentOf(asNumber(meter.limitMicroCents), asNumber(meter.usedMicroCents));
	return {
		kind,
		percent,
		resetInSec: secondsUntil(fallbackResetIso ?? meter.resetsAt, nowMs),
		status: percent >= 100 ? "rate-limited" : "ok"
	};
}
/** Percent used, clamped into [0, 100] with one decimal place. */
function percentOf(limit, used) {
	const u = used ?? 0;
	if (limit === void 0 || limit <= 0) return u > 0 ? 100 : 0;
	return clampPercent(u / limit * 100);
}
/**
* Fetch usage with the current config and stamp the fetch timestamp so the UI
* can show data freshness. The API key path is preferred; the cookie path is
* the fallback for setups that only hold a session cookie.
*/
async function fetchUsage(cfg) {
	return {
		...cfg.apiKey !== void 0 && cfg.apiKey.length > 0 ? await fetchViaApiKey(cfg) : await fetchViaCookie(cfg),
		updatedAt: Date.now()
	};
}
/** Narrow an unknown JSON value to a plain object. */
function asRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	return value;
}
/** Read a numeric field that the API may encode as a string or a number. */
function asNumber(value) {
	if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
	if (typeof value === "string" && value.length > 0) {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
}
/** Seconds from `nowMs` until an ISO instant; 0 when absent or unparseable. */
function secondsUntil(iso, nowMs) {
	if (typeof iso !== "string" || iso.length === 0) return 0;
	const at = Date.parse(iso);
	if (!Number.isFinite(at)) return 0;
	return Math.max(0, Math.round((at - nowMs) / 1e3));
}
/** Clamp into [0, 100], keeping one decimal place. */
function clampPercent(n) {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}
//#endregion
//#region src/service.ts
/**
* dsh-ocgo-usage host service — the cached OpenCode Go usage read.
* Resolves the config (env + $DSH_HOME/ocgo-usage.json) on every refresh so
* a changed cookie reaches the next query without a plugin restart, fetches
* the SSR usage page, and caches the result so the browser readout can poll
* without spamming opencode.ai.
* @module dsh-ocgo-usage/service
*/
/** After a failed fetch, skip further provider queries for this long. */
const FAILURE_COOLDOWN_MS = 6e4;
/** Map a UsageError (or any error) to a browser-safe view. */
function errorView(error) {
	if (error instanceof UsageError) return {
		error: error.code,
		message: error.message
	};
	return {
		error: "fetch",
		message: error instanceof Error ? error.message : String(error)
	};
}
/**
* Cached OpenCode Go usage read. `view()` answers from a fresh cache,
* otherwise queries the provider (deduped when concurrent). A failed query
* enters a short cooldown so a broken config is not hammered by the poller.
*/
var OcgoUsageService = class extends Service {
	enabled;
	cached;
	cachedAt = 0;
	failureUntilMs = 0;
	lastError;
	inflight;
	constructor(ctx, config = {}) {
		super(ctx, "ocgoUsage");
		this.enabled = config.enabled ?? true;
	}
	/** Whether the service answers queries while enabled. */
	isEnabled() {
		return this.enabled;
	}
	/** Cache TTL from the live config (seconds → ms). */
	ttlMs() {
		return loadConfig().cacheTTL * 1e3;
	}
	/** RPC: most recent usage view. Returns the cached view when it is still
	* fresh, otherwise re-queries the provider (deduped when concurrent). */
	async view() {
		if (!this.enabled) return {
			error: "disabled",
			message: "The ocgo-usage plugin is disabled."
		};
		const now = Date.now();
		if (this.cached !== void 0 && now - this.cachedAt < this.ttlMs()) return toView(this.cached);
		if (now < this.failureUntilMs) return this.lastError ?? {
			error: "fetch",
			message: "Unknown failure"
		};
		if (this.inflight !== void 0) return this.inflight;
		this.inflight = this.query().then((view) => {
			if (view.error === void 0) this.lastError = void 0;
			else {
				this.lastError = view;
				this.failureUntilMs = Date.now() + FAILURE_COOLDOWN_MS;
			}
			return view;
		}).finally(() => {
			this.inflight = void 0;
		});
		return this.inflight;
	}
	/** RPC: force a fresh provider query (bypasses the cache window). */
	async refresh() {
		if (!this.enabled) return {
			error: "disabled",
			message: "The ocgo-usage plugin is disabled."
		};
		const view = await this.query();
		if (view.error === void 0) {
			this.lastError = void 0;
			this.failureUntilMs = 0;
		} else {
			this.lastError = view;
			this.failureUntilMs = Date.now() + FAILURE_COOLDOWN_MS;
		}
		return view;
	}
	/**
	* Drop the cached usage, the failure cooldown, and the last error so the
	* next read re-queries with the freshly written config. Called after a
	* config edit.
	*/
	invalidateCache() {
		this.cached = void 0;
		this.cachedAt = 0;
		this.failureUntilMs = 0;
		this.lastError = void 0;
	}
	async query() {
		try {
			const data = await fetchUsage(loadConfig());
			this.cached = data;
			this.cachedAt = Date.now();
			return toView(data);
		} catch (error) {
			return errorView(error);
		}
	}
};
/** Convert the internal normalized shape into the browser view. */
function toView(data) {
	return {
		updatedAt: data.updatedAt,
		...data.rolling === void 0 ? {} : { rolling: data.rolling },
		...data.weekly === void 0 ? {} : { weekly: data.weekly },
		...data.monthly === void 0 ? {} : { monthly: data.monthly }
	};
}
//#endregion
//#region src/index.ts
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
const name = "ocgo-usage";
/** Services required before the usage service can answer. */
const inject = ["webServer"];
/** Register the usage service and its API routes on the context. */
function apply(ctx, config = {}) {
	const routes = makeOcgoRoutes(new OcgoUsageService(ctx, config));
	ctx.effect(() => {
		const disposers = routes.map((route) => ctx.webServer.register(route));
		return () => {
			for (const dispose of disposers) dispose();
		};
	}, "ocgo-usage: routes");
}
//#endregion
export { CONSOLE_GO_STATUS_PATH, GO_USAGE_PATH, OCGO_API_PREFIX, OcgoUsageService, UsageError, apply, configFilePath, credentialsFilePath, fetchUsage, fetchViaApiKey, fetchViaCookie, fromGoStatus, fromGoUsage, inject, loadConfig, makeOcgoRoutes, name, normalizeApiKey, normalizeCookie, readCredentialsRef };
