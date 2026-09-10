window.__ModuleLoader__.load({
	id: "dsh-ocgo-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/provider.ts
		/**
		* Provider matching for dsh-ocgo-usage: decide when the chip should show.
		* Pure and shared so the client logic is unit-testable without a browser.
		* @module dsh-ocgo-usage/provider
		*/
		/** Stable name retained for consumers that import the primary Go route. */
		const OCGO_PROVIDER = "opencode-go";
		/**
		* True when a provider/model belongs to any OpenCode route. Matching is
		* intentionally case-insensitive and unbounded after `opencode`, so newly
		* added OpenCode routes automatically show this subscription's usage chip.
		*/
		function isOpenCodeGo(provider) {
			return provider?.toLowerCase().includes("opencode") === true;
		}
		//#endregion
		//#region \0dsh-css:C:\Users\leyang809\Desktop\工作区\ocgo-work\src\client\ocgo.module.css.mjs
		const css = ".J4kvkW_wrap{z-index:50;user-select:none;display:inline-flex;position:absolute;bottom:calc(100% - 1px);left:-9px}.J4kvkW_segOk{color:var(--dsh-color-success,#3fb950)}.J4kvkW_chip{background:var(--dsh-color-surface,transparent);height:22px;color:var(--dsh-color-text,inherit);cursor:grab;white-space:nowrap;user-select:none;border:0;border-radius:999px;align-items:center;gap:6px;padding:0 8px;font-size:12px;line-height:1;display:inline-flex}.J4kvkW_chip:hover,.J4kvkW_chipOpen{border-color:var(--dsh-color-accent,#50a0ffb3)}.J4kvkW_lockBtn{cursor:pointer;color:var(--dsh-color-accent,#50a0ffe6);white-space:nowrap;background:0 0;border:0;align-items:center;margin-left:4px;padding:0 2px;font-size:11px;line-height:1;display:inline-flex}.J4kvkW_iconBtns{align-items:center;gap:2px;display:inline-flex}.J4kvkW_iconBtns .J4kvkW_lockBtn{margin-left:0}.J4kvkW_chipCol{border-radius:10px;flex-direction:column;align-items:flex-start;gap:3px;height:auto;padding:5px 8px}.J4kvkW_colHead{align-items:center;gap:8px;display:flex}.J4kvkW_colFoot{justify-content:space-between;align-items:center;gap:8px;width:100%;display:flex}.J4kvkW_colFoot .J4kvkW_iconBtns{margin-left:auto}.J4kvkW_seg{align-items:baseline;gap:3px;display:inline-flex}.J4kvkW_segSep{opacity:.45}.J4kvkW_segWarn{color:var(--dsh-color-warning,#d29922)}.J4kvkW_segErr{color:var(--dsh-color-danger,#e5534b)}.J4kvkW_details{z-index:40;border:1px solid var(--dsh-color-border,#80808059);background:var(--dsh-color-surface-elevated,#1f1f1f);min-width:220px;color:var(--dsh-color-text,inherit);border-radius:8px;flex-direction:column;gap:6px;padding:8px 10px;font-size:12px;display:flex;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translate(-50%);box-shadow:0 4px 12px #0000004d}.J4kvkW_window{justify-content:space-between;align-items:center;gap:12px;display:flex}.J4kvkW_windowLabel{color:var(--dsh-color-text-secondary,inherit);opacity:.9;align-items:center;gap:6px;display:inline-flex}.J4kvkW_windowValue{font-variant-numeric:tabular-nums;align-items:baseline;gap:6px;display:inline-flex}.J4kvkW_windowReset{opacity:.65;font-variant-numeric:tabular-nums;font-size:11px}.J4kvkW_foot{border-top:1px solid var(--dsh-color-border,#80808040);justify-content:space-between;align-items:center;gap:8px;padding-top:6px;font-size:11px;display:flex}.J4kvkW_footRight{align-items:center;gap:8px;margin-left:auto;display:inline-flex}.J4kvkW_setBtn{color:var(--dsh-color-accent,#50a0ffe6);cursor:pointer;text-transform:lowercase;background:0 0;border:0;padding:0;font-size:11px}.J4kvkW_setBtn:hover{text-decoration:underline}.J4kvkW_fetchedAt{opacity:.6}.J4kvkW_refreshBtn{color:var(--dsh-color-accent,#50a0ffe6);cursor:pointer;background:0 0;border:0;padding:0;font-size:11px}.J4kvkW_refreshBtn:hover{text-decoration:underline}.J4kvkW_setPanel{flex-direction:column;gap:8px;min-width:260px;display:flex}.J4kvkW_field{flex-direction:column;gap:3px;display:flex}.J4kvkW_fieldLabel{color:var(--dsh-color-text-secondary,inherit);opacity:.75;font-variant-numeric:tabular-nums;font-size:11px}.J4kvkW_fieldInput{box-sizing:border-box;border:1px solid var(--dsh-color-border,#80808059);background:var(--dsh-color-surface,transparent);width:100%;color:var(--dsh-color-text,inherit);font-variant-numeric:tabular-nums;border-radius:6px;outline:none;height:26px;padding:0 8px;font-size:12px}.J4kvkW_fieldInput:focus{border-color:var(--dsh-color-accent,#50a0ffb3)}.J4kvkW_setHint{opacity:.55;font-size:11px}.J4kvkW_errorText{color:var(--dsh-color-danger,#e5534b);white-space:normal;max-width:240px;font-size:11px}";
		const tagId = "dsh-ocgo-usage/ocgo.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ocgo-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ocgo_module_css_default = {
			"chip": "J4kvkW_chip",
			"chipCol": "J4kvkW_chipCol",
			"chipOpen": "J4kvkW_chipOpen",
			"colFoot": "J4kvkW_colFoot",
			"colHead": "J4kvkW_colHead",
			"details": "J4kvkW_details",
			"errorText": "J4kvkW_errorText",
			"fetchedAt": "J4kvkW_fetchedAt",
			"field": "J4kvkW_field",
			"fieldInput": "J4kvkW_fieldInput",
			"fieldLabel": "J4kvkW_fieldLabel",
			"foot": "J4kvkW_foot",
			"footRight": "J4kvkW_footRight",
			"iconBtns": "J4kvkW_iconBtns",
			"lockBtn": "J4kvkW_lockBtn",
			"refreshBtn": "J4kvkW_refreshBtn",
			"seg": "J4kvkW_seg",
			"segErr": "J4kvkW_segErr",
			"segOk": "J4kvkW_segOk",
			"segSep": "J4kvkW_segSep",
			"segWarn": "J4kvkW_segWarn",
			"setBtn": "J4kvkW_setBtn",
			"setHint": "J4kvkW_setHint",
			"setPanel": "J4kvkW_setPanel",
			"window": "J4kvkW_window",
			"windowLabel": "J4kvkW_windowLabel",
			"windowReset": "J4kvkW_windowReset",
			"windowValue": "J4kvkW_windowValue",
			"wrap": "J4kvkW_wrap"
		};
		//#endregion
		//#region src/client/OcgoDockEntry.tsx
		/**
		* The composer dock entry: the OpenCode Go usage readout, mounted in the
		* composer dock band (`conversation.composer.dock`) beside the conversation
		* stats line. The chip polls the host `/api/ocgo-usage` endpoint for the
		* three usage windows (rolling 5h / weekly / monthly); clicking reveals
		* per-window reset countdowns, a Set editor (masked workspace/cookie) and a
		* manual refresh. In the error state, clicking the chip opens the Set editor
		* directly so a stale credential can be replaced in place.
		* @module dsh-ocgo-usage/client/OcgoDockEntry
		*/
		/** Poll interval for the host snapshot and the live model provider. */
		const POLL_MS = 1e4;
		/** The masked-prefix shown before the last-4 tail of a secret. */
		const MASK = "••••";
		/** Locate the composer input card element: first descendant of the nearest
		* column root whose layout signature matches the card (position:relative +
		* 22px radius + capped max-width). Returns null when absent so callers can
		* degrade gracefully. */
		function findCard(wrap) {
			let el = wrap.parentElement;
			for (let i = 0; el !== null && el !== document.body && i < 6; i++) {
				for (const child of Array.from(el.children)) {
					const cs = window.getComputedStyle(child);
					if (cs.position === "relative" && cs.borderRadius === "22px" && cs.maxWidth !== "none") return child;
				}
				el = el.parentElement;
			}
			return null;
		}
		/** Same-origin JSON fetch helper. */
		async function ocgoFetch(path, init) {
			const response = await fetch(path, init);
			if (!response.ok) throw new Error(`ocgo-usage ${path} failed: ${response.status}`);
			return await response.json();
		}
		/** The host usage API as the browser sees it (same-origin JSON endpoints). */
		const ocgoApi = {
			view: () => ocgoFetch("/api/ocgo-usage"),
			refresh: () => ocgoFetch("/api/ocgo-usage/refresh"),
			config: () => ocgoFetch("/api/ocgo-usage/config"),
			writeConfig: (partial) => ocgoFetch("/api/ocgo-usage/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(partial)
			})
		};
		/** Short window label: 5h / wk / mo (iconized). */
		const WINDOW_LABELS = {
			rolling: "🕔",
			weekly: "7️⃣",
			monthly: "🈷️"
		};
		/** Full window label key for the detail panel. */
		const WINDOW_TITLE_KEYS = {
			rolling: "ocgo.rolling",
			weekly: "ocgo.weekly",
			monthly: "ocgo.monthly"
		};
		/**
		* Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
		*/
		function formatDuration(totalSec) {
			if (totalSec < 60) return `${Math.max(0, Math.floor(totalSec))}s`;
			if (totalSec < 3600) return `${Math.floor(totalSec / 60)}m`;
			if (totalSec < 86400) {
				const h = Math.floor(totalSec / 3600);
				const m = Math.floor(totalSec % 3600 / 60);
				return m > 0 ? `${h}h ${m}m` : `${h}h`;
			}
			const d = Math.floor(totalSec / 86400);
			const h = Math.floor(totalSec % 86400 / 3600);
			return h > 0 ? `${d}d ${h}h` : `${d}d`;
		}
		/** Format an epoch-ms time as HH:MM. */
		function formatClock(epochMs) {
			const d = new Date(epochMs);
			return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		}
		/** The severity class of one window (muted → warn → err). */
		function severityClass(window) {
			if (window.status === "rate-limited" || window.percent >= 90) return ocgo_module_css_default.segErr;
			if (window.percent >= 80) return ocgo_module_css_default.segWarn;
		}
		/**
		* Render one window segment: inline `· 🕔 23% (3h 25m)`, or a bare
		* `🕔 23% (3h 25m)` line in the stacked layout (no separator).
		* @param props - the window plus the inline separator (omit for stacked).
		*/
		function WindowSegment(props) {
			const { window, sep } = props;
			const cls = severityClass(window);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.seg,
				children: [sep !== void 0 && sep !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.segSep,
					children: sep
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: cls ?? void 0,
					children: [
						WINDOW_LABELS[window.kind],
						" ",
						window.percent,
						"% (",
						formatDuration(window.resetInSec),
						")"
					]
				})]
			});
		}
		/** The masked display text for one secret field: `••••abcd`. */
		function maskedText(secret) {
			if (secret === void 0 || !secret.set || secret.tail.length === 0) return "";
			return `${MASK}${secret.tail}`;
		}
		/** Daily remaining average from the monthly window:
		* (100 - used%) / days-left. Returns null when unusable. */
		function dailyRemaining(window) {
			if (window === void 0 || window.resetInSec <= 0) return null;
			const days = window.resetInSec / 86400;
			if (days < .01) return null;
			return Math.max(0, 100 - window.percent) / days;
		}
		/** Severity of the daily remaining average: <3% err, <5% warn, ok green. */
		function dailySeverityClass(daily) {
			if (daily < 3) return ocgo_module_css_default.segErr;
			if (daily < 5) return ocgo_module_css_default.segWarn;
			return ocgo_module_css_default.segOk;
		}
		/**
		* The OpenCode Go usage chip: polls the host snapshot, renders the three
		* windows inline, and expands into a detail panel on click.
		* @param props - the composed dock entry props.
		*/
		function OcgoDockEntry(props) {
			const [view, setView] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [visible, setVisible] = (0, react.useState)(true);
			const [mode, setMode] = (0, react.useState)("view");
			const [config, setConfig] = (0, react.useState)(null);
			const [wsDraft, setWsDraft] = (0, react.useState)("");
			const [cookieDraft, setCookieDraft] = (0, react.useState)("");
			const wrapRef = (0, react.useRef)(null);
			const [pos, setPos] = (0, react.useState)(() => {
				try {
					const raw = window.localStorage.getItem("dsh.ocgoChip.pos");
					if (raw !== null) {
						const p = JSON.parse(raw);
						if (typeof p.x === "number" && typeof p.y === "number") return {
							x: p.x,
							y: p.y
						};
					}
				} catch {}
				return null;
			});
			const [locked, setLocked] = (0, react.useState)(() => window.localStorage.getItem("dsh.ocgoChip.locked") === "1");
			/** Chip layout: one inline line ("row", the default) or one metric per line
			* ("col"). Toggled from the chip, persisted under "dsh.ocgoChip.layout". */
			const [layout, setLayout] = (0, react.useState)(() => window.localStorage.getItem("dsh.ocgoChip.layout") === "col" ? "col" : "row");
			const toggleLayout = (0, react.useCallback)(() => {
				setLayout((prev) => {
					const next = prev === "row" ? "col" : "row";
					try {
						window.localStorage.setItem("dsh.ocgoChip.layout", next);
					} catch {}
					return next;
				});
			}, []);
			const dragRef = (0, react.useRef)({
				active: false,
				moved: false,
				startX: 0,
				startY: 0,
				baseLeft: 0,
				baseTop: 0
			});
			const posRef = (0, react.useRef)(pos);
			posRef.current = pos;
			/** User offset of the chip relative to the input card (pixels).
			* DOM-controlled (no re-render per frame); persisted under
			* "dsh.ocgoChip.offset". The legacy "dsh.ocgoChip.pos" key is migrated
			* once during calibration. */
			const offsetRef = (0, react.useRef)(null);
			if (offsetRef.current === null) try {
				const raw = window.localStorage.getItem("dsh.ocgoChip.offset");
				if (raw !== null) {
					const p = JSON.parse(raw);
					if (typeof p.x === "number" && typeof p.y === "number") offsetRef.current = {
						x: p.x,
						y: p.y
					};
				}
			} catch {}
			/** Last DOM-applied viewport position (avoids redundant writes). */
			const chipStyleRef = (0, react.useRef)(null);
			/** Cached input-card element (re-found when detached). */
			const cardRef = (0, react.useRef)(null);
			/** Calibrate once per mount: express the chip's current position as an
			* offset relative to the input card (migrates the legacy pos key), then
			* hand position control over to the rAF follower below. */
			(0, react.useLayoutEffect)(() => {
				const wrap = wrapRef.current;
				if (wrap === null) return;
				const card = findCard(wrap);
				if (card === null) return;
				cardRef.current = card;
				if (offsetRef.current === null) {
					const wrapRect = wrap.getBoundingClientRect();
					const cardRect = card.getBoundingClientRect();
					offsetRef.current = {
						x: Math.round(wrapRect.left - cardRect.left),
						y: Math.round(wrapRect.top - cardRect.top)
					};
					try {
						window.localStorage.setItem("dsh.ocgoChip.offset", JSON.stringify(offsetRef.current));
					} catch {}
				}
				try {
					window.localStorage.removeItem("dsh.ocgoChip.pos");
				} catch {}
				if (posRef.current !== null) setPos(null);
			}, [visible]);
			/** Keep the chip's BOTTOM edge anchored across height changes: the follower
			* anchors the top-left corner, so a taller stacked chip would otherwise grow
			* downward over the composer card. Shifting the offset by the height delta
			* leaves the resting place (just above the card) intact in both layouts.
			* Deliberately dependency-free: it re-measures after every render (one rect
			* read) so a layout toggle, an error state, or the daily line appearing all
			* keep the bottom edge put. */
			const layoutHeightRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const wrap = wrapRef.current;
				if (wrap === null) return;
				const height = Math.round(wrap.getBoundingClientRect().height);
				const prev = layoutHeightRef.current;
				layoutHeightRef.current = height;
				const offset = offsetRef.current;
				if (prev === null || prev === height || offset === null) return;
				offsetRef.current = {
					x: offset.x,
					y: offset.y + (prev - height)
				};
				chipStyleRef.current = null;
				try {
					window.localStorage.setItem("dsh.ocgoChip.offset", JSON.stringify(offsetRef.current));
				} catch {}
			});
			/** Follow the input card every frame: the chip keeps the same pixel delta
			* from the card while the sidebar width changes or the page scrolls.
			* Writes are skipped while the position is unchanged. */
			(0, react.useEffect)(() => {
				let raf = 0;
				const loop = () => {
					raf = window.requestAnimationFrame(loop);
					const wrap = wrapRef.current;
					const offset = offsetRef.current;
					if (wrap === null || offset === null) return;
					let card = cardRef.current;
					if (card === null || !document.body.contains(card)) {
						card = findCard(wrap);
						cardRef.current = card;
						if (card === null) return;
					}
					const cardRect = card.getBoundingClientRect();
					const x = Math.round(cardRect.left + offset.x);
					const y = Math.round(cardRect.top + offset.y);
					const prev = chipStyleRef.current;
					if (prev !== null && prev.x === x && prev.y === y) return;
					wrap.style.position = "fixed";
					wrap.style.left = `${x}px`;
					wrap.style.top = `${y}px`;
					wrap.style.bottom = "auto";
					chipStyleRef.current = {
						x,
						y
					};
				};
				raf = window.requestAnimationFrame(loop);
				return () => {
					window.cancelAnimationFrame(raf);
					chipStyleRef.current = null;
				};
			}, [visible]);
			const modeRef = (0, react.useRef)("view");
			modeRef.current = mode;
			const draftsRef = (0, react.useRef)({
				ws: "",
				cookie: ""
			});
			draftsRef.current = {
				ws: wsDraft,
				cookie: cookieDraft
			};
			const configRef = (0, react.useRef)(null);
			configRef.current = config;
			const pollNow = (0, react.useCallback)(() => {
				let live = true;
				const provider = props.provider;
				(provider !== void 0 ? Promise.resolve(provider()).then((p) => p ?? void 0, () => void 0) : Promise.resolve(void 0)).then((p) => {
					if (!live) return;
					const shown = p === void 0 ? true : isOpenCodeGo(p);
					setVisible(shown);
					if (!shown) setOpen(false);
					if (shown) ocgoApi.view().then((snapshot) => {
						if (live) setView(snapshot);
					}, () => {
						if (live) setView(null);
					});
				}, () => {
					if (live) setVisible(false);
				});
				return () => {
					live = false;
				};
			}, [props.provider]);
			(0, react.useEffect)(() => {
				const cleanup = pollNow();
				const timer = window.setInterval(pollNow, POLL_MS);
				const onVisibility = () => {
					if (document.visibilityState === "visible") pollNow();
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					cleanup();
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [pollNow]);
			/** Load the masked config into the editor drafts. */
			const loadConfig = (0, react.useCallback)(() => {
				ocgoApi.config().then((snapshot) => {
					setConfig(snapshot);
					setWsDraft(maskedText(snapshot.workspaceID));
					setCookieDraft(maskedText(snapshot.cookie));
				}, () => {
					setConfig(null);
					setWsDraft("");
					setCookieDraft("");
				});
			}, []);
			/** Submit any edited field; returns the write promise (fire-and-forget on blur). */
			const saveConfig = (0, react.useCallback)(() => {
				const current = configRef.current;
				const partial = {};
				if (current !== null) {
					const ws = draftsRef.current.ws.trim();
					if (ws.length > 0 && ws !== maskedText(current.workspaceID)) partial.workspaceID = ws;
					const cookie = draftsRef.current.cookie.trim();
					if (cookie.length > 0 && cookie !== maskedText(current.cookie)) partial.cookie = cookie;
				} else {
					if (draftsRef.current.ws.trim().length > 0) partial.workspaceID = draftsRef.current.ws.trim();
					if (draftsRef.current.cookie.trim().length > 0) partial.cookie = draftsRef.current.cookie.trim();
				}
				if (Object.keys(partial).length === 0) return;
				ocgoApi.writeConfig(partial).then((snapshot) => {
					setConfig(snapshot);
					setWsDraft(maskedText(snapshot.workspaceID));
					setCookieDraft(maskedText(snapshot.cookie));
					pollNow();
				}, () => {});
			}, [pollNow]);
			/** Close the panel; in set mode a blur/close acts as confirm (save). */
			const closePanel = (0, react.useCallback)(() => {
				if (modeRef.current === "set") saveConfig();
				setOpen(false);
				setMode("view");
			}, [saveConfig]);
			/** Open the editor (used by the Set button and the error chip). */
			const openSet = (0, react.useCallback)(() => {
				setMode("set");
				setOpen(true);
				loadConfig();
			}, [loadConfig]);
			/** Drag start: record the pointer origin and the chip's current card
			* offset. Locked chips are not draggable. */
			const onWrapMouseDown = (event) => {
				if (locked) return;
				const wrap = wrapRef.current;
				if (wrap === null) return;
				event.preventDefault();
				let offset = offsetRef.current;
				if (offset === null) {
					const card = findCard(wrap);
					if (card !== null) {
						const wrapRect = wrap.getBoundingClientRect();
						const cardRect = card.getBoundingClientRect();
						offset = {
							x: Math.round(wrapRect.left - cardRect.left),
							y: Math.round(wrapRect.top - cardRect.top)
						};
						offsetRef.current = offset;
						cardRef.current = card;
					} else offset = {
						x: 0,
						y: 0
					};
				}
				dragRef.current = {
					active: true,
					moved: false,
					startX: event.clientX,
					startY: event.clientY,
					baseLeft: offset.x,
					baseTop: offset.y
				};
			};
			/** Toggle the drag lock (persisted under "dsh.ocgoChip.locked"). */
			const toggleLock = () => {
				setLocked((prev) => {
					const next = !prev;
					try {
						window.localStorage.setItem("dsh.ocgoChip.locked", next ? "1" : "0");
					} catch {}
					return next;
				});
			};
			/** Drag move/end listeners (window-scoped so the drag survives the pointer
			* leaving the chip). Positions are written straight to the DOM. */
			(0, react.useEffect)(() => {
				const onMove = (event) => {
					const d = dragRef.current;
					if (!d.active) return;
					const dx = event.clientX - d.startX;
					const dy = event.clientY - d.startY;
					if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
					if (d.moved) {
						const offset = {
							x: d.baseLeft + dx,
							y: d.baseTop + dy
						};
						offsetRef.current = offset;
						const wrap = wrapRef.current;
						const card = cardRef.current;
						if (wrap !== null && card !== null) {
							const cardRect = card.getBoundingClientRect();
							wrap.style.left = `${Math.round(cardRect.left + offset.x)}px`;
							wrap.style.top = `${Math.round(cardRect.top + offset.y)}px`;
						}
						document.body.style.cursor = "grabbing";
					}
				};
				const onUp = () => {
					const d = dragRef.current;
					if (!d.active) return;
					d.active = false;
					document.body.style.cursor = "";
					if (d.moved) {
						d.moved = false;
						try {
							window.localStorage.setItem("dsh.ocgoChip.offset", JSON.stringify(offsetRef.current));
						} catch {}
					}
				};
				window.addEventListener("mousemove", onMove);
				window.addEventListener("mouseup", onUp);
				return () => {
					window.removeEventListener("mousemove", onMove);
					window.removeEventListener("mouseup", onUp);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) closePanel();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") closePanel();
				};
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open, closePanel]);
			const refresh = () => {
				ocgoApi.refresh().then((snapshot) => {
					setView(snapshot);
				}, () => {});
			};
			const t = props.t;
			const sep = ` ${t("ocgo.sep")} `;
			if (!visible) return null;
			const error = view === null ? {
				code: "fetch",
				message: t("ocgo.error", { code: "fetch" })
			} : view.error !== void 0 ? {
				code: view.error,
				message: view.message ?? t("ocgo.error", { code: view.error })
			} : null;
			if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.wrap,
				ref: wrapRef,
				"data-testid": "ocgo-chip-error",
				style: pos === null ? void 0 : {
					left: `${pos.x}px`,
					top: `${pos.y}px`,
					bottom: "auto"
				},
				onMouseDown: onWrapMouseDown,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: open ? `${ocgo_module_css_default.chip} ${ocgo_module_css_default.chipOpen}` : ocgo_module_css_default.chip,
					onClick: () => {
						if (open) closePanel();
						else openSet();
					},
					title: `${error.message}\n${t("ocgo.set")}`,
					children: [
						t("ocgo.label"),
						": <err:",
						error.code,
						">"
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.details,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.setPanel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.workspaceID")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: wsDraft,
									placeholder: "wrk_…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setWsDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.workspaceID)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.cookie")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: cookieDraft,
									placeholder: "auth=…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setCookieDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.cookie)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ocgo_module_css_default.foot,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.setHint,
									children: t("ocgo.setHint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ocgo_module_css_default.refreshBtn,
									onClick: closePanel,
									children: t("ocgo.save")
								})]
							})
						]
					})
				})]
			});
			const snapshot = view;
			const windows = [
				snapshot.rolling,
				snapshot.weekly,
				snapshot.monthly
			].filter((w) => w !== void 0);
			const daily = dailyRemaining(snapshot.monthly);
			const dailyCls = daily === null ? void 0 : dailySeverityClass(daily);
			const col = layout === "col";
			/** The trailing icon cluster (layout toggle + lock pin): the inline chip
			* renders it last, the stacked chip on its last line. */
			const iconButtons = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.iconBtns,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.lockBtn,
					role: "button",
					title: col ? t("ocgo.layoutToRow") : t("ocgo.layoutToCol"),
					"data-testid": "ocgo-layout-toggle",
					onClick: (e) => {
						e.stopPropagation();
						toggleLayout();
					},
					children: col ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						width: "12",
						height: "12",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "3",
							y: "8.5",
							width: "18",
							height: "7",
							rx: "3.5"
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						width: "12",
						height: "12",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 6h16M4 12h16M4 18h16" })
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.lockBtn,
					role: "button",
					title: locked ? t("ocgo.unlock") : t("ocgo.lock"),
					onClick: (e) => {
						e.stopPropagation();
						toggleLock();
					},
					children: locked ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						width: "12",
						height: "12",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2.5",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18M6 6l12 12" })
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						width: "12",
						height: "12",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" })
					})
				})]
			});
			if (windows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: ocgo_module_css_default.chip,
				onClick: refresh,
				title: t("ocgo.refresh"),
				"data-testid": "ocgo-chip-empty",
				children: [
					t("ocgo.label"),
					": ",
					t("ocgo.unavailable")
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.wrap,
				ref: wrapRef,
				"data-testid": "ocgo-chip",
				style: pos === null ? void 0 : {
					left: `${pos.x}px`,
					top: `${pos.y}px`,
					bottom: "auto"
				},
				onMouseDown: onWrapMouseDown,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: [
						ocgo_module_css_default.chip,
						col ? ocgo_module_css_default.chipCol : "",
						open ? ocgo_module_css_default.chipOpen : ""
					].filter((c) => c !== "").join(" "),
					onClick: () => {
						if (dragRef.current.moved) {
							dragRef.current.moved = false;
							return;
						}
						if (open) closePanel();
						else setOpen(true);
					},
					title: open ? t("ocgo.collapse") : t("ocgo.expand"),
					children: col ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.colHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("ocgo.labelShort"), ":"] }), snapshot.updatedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.segSep,
								children: t("ocgo.fetchedAt", { time: formatClock(snapshot.updatedAt) })
							})]
						}),
						windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowSegment, { window: w }, w.kind)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.colFoot,
							children: [daily !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.seg,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: dailyCls ?? void 0,
									children: [
										"⏳ ",
										daily.toFixed(1),
										"%/天"
									]
								})
							}), iconButtons]
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("ocgo.label"), ":"] }),
						windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowSegment, {
							window: w,
							sep
						}, w.kind)),
						daily !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.seg,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.segSep,
								children: sep
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: dailyCls ?? void 0,
								children: [
									"⏳ ",
									daily.toFixed(1),
									"%/天"
								]
							})]
						}),
						snapshot.updatedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.segSep,
							children: [sep, t("ocgo.fetchedAt", { time: formatClock(snapshot.updatedAt) })]
						}),
						iconButtons
					] })
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.details,
					children: mode === "set" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.setPanel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.workspaceID")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: wsDraft,
									placeholder: "wrk_…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setWsDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.workspaceID)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.cookie")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: cookieDraft,
									placeholder: "auth=…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setCookieDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.cookie)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ocgo_module_css_default.foot,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.setHint,
									children: t("ocgo.setHint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ocgo_module_css_default.refreshBtn,
									onClick: closePanel,
									children: t("ocgo.save")
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.window,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ocgo_module_css_default.windowLabel,
							children: w.status === "rate-limited" ? t("ocgo.rateLimited") : t(WINDOW_TITLE_KEYS[w.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.windowValue,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: severityClass(w) ?? void 0,
								children: [w.percent, "%"]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.windowReset,
								children: t("ocgo.resetsIn", { duration: formatDuration(w.resetInSec) })
							})]
						})]
					}, w.kind)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.foot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ocgo_module_css_default.setBtn,
							onClick: openSet,
							children: t("ocgo.set")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.footRight,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ocgo_module_css_default.refreshBtn,
								onClick: refresh,
								children: t("ocgo.refresh")
							}), snapshot.updatedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.fetchedAt,
								children: t("ocgo.fetchedAt", { time: formatClock(snapshot.updatedAt) })
							})]
						})]
					})] })
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Chinese copy. */
		const zh = {
			"ocgo.label": "OpenCode Go",
			"ocgo.labelShort": "⚡ Go",
			"ocgo.unavailable": "用量不可用",
			"ocgo.error": "查询失败：{code}",
			"ocgo.noconfig": "未配置：请设置 OPENCODE_GO_COOKIE 与 OPENCODE_GO_WORKSPACE_ID（或 $DSH_HOME/ocgo-usage.json）",
			"ocgo.refresh": "刷新",
			"ocgo.fetchedAt": "upd {time}",
			"ocgo.rolling": "5h 滚动",
			"ocgo.weekly": "每周",
			"ocgo.monthly": "每月",
			"ocgo.rateLimited": "已限流",
			"ocgo.resetsIn": "剩余 {duration}",
			"ocgo.expand": "展开用量详情",
			"ocgo.collapse": "收起",
			"ocgo.layoutToCol": "切换为竖排",
			"ocgo.layoutToRow": "切换为横排",
			"ocgo.lock": "固定",
			"ocgo.unlock": "取消固定",
			"ocgo.sep": "·",
			"ocgo.set": "设置",
			"ocgo.save": "保存",
			"ocgo.workspaceID": "workspace id",
			"ocgo.cookie": "cookie",
			"ocgo.setHint": "点击外部或按 Esc 保存"
		};
		/** English copy. */
		const en = {
			"ocgo.label": "OpenCode Go",
			"ocgo.labelShort": "⚡ Go",
			"ocgo.unavailable": "usage unavailable",
			"ocgo.error": "Query failed: {code}",
			"ocgo.noconfig": "Not configured: set OPENCODE_GO_COOKIE and OPENCODE_GO_WORKSPACE_ID (or $DSH_HOME/ocgo-usage.json)",
			"ocgo.refresh": "Refresh",
			"ocgo.fetchedAt": "upd {time}",
			"ocgo.rolling": "5h Rolling",
			"ocgo.weekly": "Weekly",
			"ocgo.monthly": "Monthly",
			"ocgo.rateLimited": "rate-limited",
			"ocgo.resetsIn": "resets in {duration}",
			"ocgo.expand": "Show usage details",
			"ocgo.collapse": "Collapse",
			"ocgo.layoutToCol": "Switch to stacked layout",
			"ocgo.layoutToRow": "Switch to inline layout",
			"ocgo.lock": "Pin",
			"ocgo.unlock": "Unpin",
			"ocgo.sep": "·",
			"ocgo.set": "Set",
			"ocgo.save": "Save",
			"ocgo.workspaceID": "workspace id",
			"ocgo.cookie": "cookie",
			"ocgo.setHint": "click outside or press Esc to save"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "ocgo";
		/** Required services: slots for the composer-dock entry, locale for the copy. */
		const inject = ["slots", "locale"];
		/**
		* Read one session's CURRENT model selection from the `modelSelection` session
		* projection, which is where DSH carries it now (`next` already falls back to
		* `lastUsed`). The pre-0.1.2 `connection.api.sessions.models` RPC this plugin
		* used is gone from DSH, and its failure was silent: `provider()` returned
		* undefined, the dock entry read that as "not an OpenCode route", and rendered
		* nothing at all.
		*
		* The service is read structurally instead of through the typed service map
		* because this package's build-time devDependencies predate the client
		* `sessions` service, so naming it in the typed `inject` list would not
		* compile — while DSH runtime resolves it normally.
		* @param scope - the client scope owning the slot registration.
		* @param sessionId - the session the dock entry renders for.
		* @returns the projected selection, or undefined while it is unreadable.
		*/
		function modelSelectionOf(scope, sessionId) {
			if (sessionId === void 0) return void 0;
			return (scope.get("sessions")?.binding?.(sessionId)?.session?.projections?.faceOf?.("modelSelection"))?.getSnapshot?.();
		}
		/**
		* Register the usage chip into the composer dock band.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-ocgo-usage: dictionaries");
			ctx.inject([
				"slots",
				"conversation",
				"connection"
			], (scope) => {
				scope.effect(() => scope.slots.register({
					name: "conversation.composer.dock",
					id: "ocgo-usage",
					order: 110,
					locale: NS,
					inject: (sessionId) => ({
						dockSessionId: sessionId,
						provider: async () => {
							const selection = modelSelectionOf(scope, sessionId);
							return selection?.next?.provider ?? selection?.lastUsed?.provider ?? void 0;
						}
					})
				}, OcgoDockEntry), "dsh-ocgo-usage: chip registration");
			});
		}
		//#endregion
		exports.OCGO_PROVIDER = OCGO_PROVIDER;
		exports.OcgoDockEntry = OcgoDockEntry;
		exports.apply = apply;
		exports.formatDuration = formatDuration;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map