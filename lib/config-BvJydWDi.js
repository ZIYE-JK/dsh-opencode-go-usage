import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/config.ts
/**
* Configuration loader for dsh-ocgo-usage
*
* Credential resolution order for the OpenCode Go usage API:
*   1. env `OPENCODE_GO_API_KEY`
*   2. this plugin's config file (`$DSH_HOME/ocgo-usage.json` → `apiKey`)
*   3. the harness credential table (`$DSH_HOME/.credentials.yaml` → `refs`)
*
* Step 3 is what makes the plugin work with no configuration at all: DSH's own
* `opencode-go` model route already stores its key under that reference name.
*
* A session cookie is also supported as a deprecated fallback (see api.ts);
* it expires and needs periodic refreshing, so the API key is preferred.
*
* Priority for the other fields: env vars > config file > built-in defaults.
*
* Secrets are NEVER logged. If neither source provides a usable value the
* browser readout shows a clean `noconfig` error.
*
* The browser config editor (`/api/ocgo-usage/config`) reads a MASKED view
* (never the full secret) and writes back through {@link writeConfigFile}.
* @module dsh-ocgo-usage/config
*/
const ENV_API_KEY = "OPENCODE_GO_API_KEY";
const ENV_COOKIE = "OPENCODE_GO_COOKIE";
const ENV_WORKSPACE_ID = "OPENCODE_GO_WORKSPACE_ID";
const ENV_CACHE_TTL = "OPENCODE_GO_CACHE_TTL";
const ENV_TIMEOUT_MS = "OPENCODE_GO_TIMEOUT_MS";
const DEFAULT_BASE_URL = "https://opencode.ai";
const DEFAULT_TIMEOUT_MS = 1e4;
const MAX_CACHE_TTL = 3600;
/** Resolve the DSH home directory ($DSH_HOME or ~/.dsh). */
function dshHome() {
	const explicit = process.env.DSH_HOME;
	if (typeof explicit === "string" && explicit.length > 0) return explicit;
	return join(homedir(), ".dsh");
}
/** Resolved location of the plugin config file. */
function configFilePath() {
	return join(dshHome(), "ocgo-usage.json");
}
/** Resolved location of the harness credential table. */
function credentialsFilePath() {
	return join(dshHome(), ".credentials.yaml");
}
/**
* Load and merge config from file + env vars.
* Returns a fully resolved OcgoConfig; never throws.
*/
function loadConfig() {
	const fileConfig = readFileConfig();
	return {
		apiKey: normalizeApiKey(pickString(process.env[ENV_API_KEY], asString(fileConfig?.apiKey) ?? readCredentialsRef("OPENCODE_GO_API_KEY"))),
		cookie: normalizeCookie(pickString(process.env[ENV_COOKIE], asString(fileConfig?.cookie))),
		workspaceID: pickString(process.env[ENV_WORKSPACE_ID], asString(fileConfig?.workspaceID)),
		baseUrl: pickString(process.env["OPENCODE_GO_BASE_URL"], asString(fileConfig?.baseUrl)) || "https://opencode.ai",
		cacheTTL: clamp(pickNumber(process.env[ENV_CACHE_TTL], asNumber(fileConfig?.cacheTTL), 300), 60, MAX_CACHE_TTL),
		timeoutMs: Math.max(0, pickNumber(process.env[ENV_TIMEOUT_MS], asNumber(fileConfig?.timeoutMs), DEFAULT_TIMEOUT_MS))
	};
}
/**
* Read one reference out of the harness credential table
* (`$DSH_HOME/.credentials.yaml` → `refs:`). Returns undefined when the file,
* the block, or the reference is absent — never throws.
*/
function readCredentialsRef(ref) {
	const text = readFileSafe(credentialsFilePath());
	if (text === void 0) return void 0;
	const block = extractRefsBlock(text);
	if (block === void 0) return void 0;
	const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const value = block.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.+)$`, "m"))?.[1];
	if (value === void 0) return void 0;
	const bare = value.replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "").trim();
	return bare.length > 0 ? bare : void 0;
}
/** The indented body of the top-level `refs:` mapping, when present. */
function extractRefsBlock(text) {
	const lines = text.split(/\r?\n/);
	const out = [];
	let inside = false;
	for (const line of lines) {
		if (!inside) {
			if (/^refs\s*:/.test(line)) inside = true;
			continue;
		}
		if (/^\S/.test(line)) break;
		out.push(line);
	}
	return out.length > 0 ? out.join("\n") : void 0;
}
/** Read a file as UTF-8, or undefined when it is missing or unreadable. */
function readFileSafe(path) {
	if (!existsSync(path)) return void 0;
	try {
		return readFileSync(path, "utf8");
	} catch {
		return;
	}
}
/** Mask the last 4 characters of a secret for the browser (full value when ≤ 4 chars). */
function maskSecret(value) {
	if (value === void 0 || value.length === 0) return {
		set: false,
		tail: ""
	};
	return {
		set: true,
		tail: value.length <= 4 ? value : value.slice(-4)
	};
}
/** The browser-facing masked config view (never reveals a full secret). */
function maskedConfigView() {
	const cfg = loadConfig();
	return {
		workspaceID: maskSecret(cfg.workspaceID),
		apiKey: maskSecret(cfg.apiKey),
		cookie: maskSecret(cfg.cookie)
	};
}
/**
* Write apiKey / cookie / workspaceID into the plugin config file (preserving
* any other fields), chmod 600, and return the updated masked view. Values are
* normalized like env input (a bare key gets no prefix; a cookie gets `auth=`
* prefixed when pasted bare). Empty/absent fields are left untouched; pass
* `null` to clear a field.
*/
function writeConfigFile(partial) {
	const next = { ...readFileConfig() ?? {} };
	if (partial.workspaceID !== void 0) {
		const v = typeof partial.workspaceID === "string" ? partial.workspaceID.trim() : "";
		if (v.length > 0) next.workspaceID = v;
		else delete next.workspaceID;
	}
	if (partial.apiKey !== void 0) {
		const v = typeof partial.apiKey === "string" ? normalizeApiKey(partial.apiKey) : void 0;
		if (v !== void 0 && v.length > 0) next.apiKey = v;
		else delete next.apiKey;
	}
	if (partial.cookie !== void 0) {
		const v = typeof partial.cookie === "string" ? normalizeCookie(partial.cookie) : void 0;
		if (v !== void 0 && v.length > 0) next.cookie = v;
		else delete next.cookie;
	}
	const path = configFilePath();
	try {
		writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 384 });
	} catch {
		return maskedConfigView();
	}
	return {
		workspaceID: maskSecret(typeof next.workspaceID === "string" ? next.workspaceID : void 0),
		apiKey: maskSecret(typeof next.apiKey === "string" ? next.apiKey : void 0),
		cookie: maskSecret(typeof next.cookie === "string" ? next.cookie : void 0)
	};
}
function readFileConfig() {
	const raw = readFileSafe(configFilePath());
	if (raw === void 0) return null;
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") return parsed;
		return null;
	} catch {
		return null;
	}
}
function pickString(envVal, fileVal) {
	if (envVal && envVal.length > 0) return envVal;
	if (fileVal && fileVal.length > 0) return fileVal;
}
/**
* Normalize a user-provided service-account API key.
*
* Accepts either the bare key (`oc_sk_...` / `sk-...`) or a pasted
* `Authorization` header value (`Bearer …`), and strips surrounding
* whitespace/quotes so a copy from the console always lands in a usable form.
*/
function normalizeApiKey(input) {
	if (!input) return void 0;
	let v = input.trim().replace(/\s+/g, "");
	if (!v) return void 0;
	if (/^Bearer:/i.test(v)) v = v.slice(7);
	else if (/^Bearer/i.test(v)) v = v.slice(6);
	v = v.replace(/^["']|["']$/g, "").trim();
	return v.length > 0 ? v : void 0;
}
/**
* Normalize a user-provided cookie string into a valid `Cookie:` header value.
*
* Accepts three forms:
*  1. Full header: "auth=Fe26.2*...; oc_locale=zh"   (passthrough)
*  2. Single value: "Fe26.2*..."                    (auto-prefix "auth=")
*  3. Two-segment:  "Fe26.2*...; oc_locale=zh"       (auto-prefix "auth=",
*                                                       keep oc_locale)
*
* Strips leading/trailing whitespace, collapses internal whitespace, and
* defaults `oc_locale=en` when only the auth value is present.
*/
function normalizeCookie(input) {
	if (!input) return void 0;
	const trimmed = input.trim().replace(/\s+/g, " ");
	if (!trimmed) return void 0;
	const hasAuthPrefix = /^auth=/.test(trimmed);
	const segments = trimmed.split(/;\s*/).filter(Boolean);
	const ocLocale = segments.find((s) => s.startsWith("oc_locale="));
	if (hasAuthPrefix) return `${(segments.find((s) => s.startsWith("auth=")) ?? segments[0] ?? "").trim()}; ${ocLocale ?? "oc_locale=en"}`;
	return `auth=${(segments[0] ?? "").trim()}; ${segments.slice(1).map((s) => s.trim()).filter(Boolean).find((s) => s.startsWith("oc_locale=")) ?? "oc_locale=en"}`;
}
function pickNumber(envVal, fileVal, fallback) {
	const fromEnv = envVal ? Number.parseInt(envVal, 10) : NaN;
	if (Number.isFinite(fromEnv)) return fromEnv;
	if (fileVal !== void 0 && Number.isFinite(fileVal)) return fileVal;
	return fallback;
}
function asString(v) {
	return typeof v === "string" && v.length > 0 ? v : void 0;
}
function asNumber(v) {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string") {
		const n = Number.parseInt(v, 10);
		if (Number.isFinite(n)) return n;
	}
}
function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}
//#endregion
export { loadConfig as a, normalizeCookie as c, credentialsFilePath as i, readCredentialsRef as l, DEFAULT_TIMEOUT_MS as n, maskedConfigView as o, configFilePath as r, normalizeApiKey as s, DEFAULT_BASE_URL as t, writeConfigFile as u };
