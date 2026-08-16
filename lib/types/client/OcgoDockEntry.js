import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isOpenCodeGo } from "../provider.js";
import css from './ocgo.module.css';
/** Poll interval for the host snapshot and the live model provider. */
const POLL_MS = 10_000;
/** The masked-prefix shown before the last-4 tail of a secret. */
const MASK = '••••';
/** Locate the composer input card element: first descendant of the nearest
 * column root whose layout signature matches the card (position:relative +
 * 22px radius + capped max-width). Returns null when absent so callers can
 * degrade gracefully. */
function findCard(wrap) {
    let el = wrap.parentElement;
    for (let i = 0; el !== null && el !== document.body && i < 6; i++) {
        for (const child of Array.from(el.children)) {
            const cs = window.getComputedStyle(child);
            if (cs.position === 'relative' && cs.borderRadius === '22px' && cs.maxWidth !== 'none')
                return child;
        }
        el = el.parentElement;
    }
    return null;
}
/** Same-origin JSON fetch helper. */
async function ocgoFetch(path, init) {
    const response = await fetch(path, init);
    if (!response.ok) {
        throw new Error(`ocgo-usage ${path} failed: ${response.status}`);
    }
    return (await response.json());
}
/** The host usage API as the browser sees it (same-origin JSON endpoints). */
const ocgoApi = {
    view: () => ocgoFetch('/api/ocgo-usage'),
    refresh: () => ocgoFetch('/api/ocgo-usage/refresh'),
    config: () => ocgoFetch('/api/ocgo-usage/config'),
    writeConfig: (partial) => ocgoFetch('/api/ocgo-usage/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(partial),
    }),
};
/** Short window label: 5h / wk / mo (iconized). */
const WINDOW_LABELS = {
    rolling: '🕔',
    weekly: '7️⃣',
    monthly: '🈷️',
};
/** Full window label key for the detail panel. */
const WINDOW_TITLE_KEYS = {
    rolling: 'ocgo.rolling',
    weekly: 'ocgo.weekly',
    monthly: 'ocgo.monthly',
};
/**
 * Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
 */
export function formatDuration(totalSec) {
    if (totalSec < 60)
        return `${Math.max(0, Math.floor(totalSec))}s`;
    if (totalSec < 3600)
        return `${Math.floor(totalSec / 60)}m`;
    if (totalSec < 86400) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
/** Format an epoch-ms time as HH:MM. */
function formatClock(epochMs) {
    const d = new Date(epochMs);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}
/** The severity class of one window (muted → warn → err). */
function severityClass(window) {
    if (window.status === 'rate-limited' || window.percent >= 90)
        return css.segErr;
    if (window.percent >= 80)
        return css.segWarn;
    return undefined;
}
/** Render one window segment: `· 5h 23% (3h 25m)`. */
function WindowSegment(props) {
    const { window, sep } = props;
    const cls = severityClass(window);
    return (_jsxs("span", { className: css.seg, children: [_jsx("span", { className: css.segSep, children: sep }), _jsxs("span", { className: cls ?? undefined, children: [WINDOW_LABELS[window.kind], " ", window.percent, "% (", formatDuration(window.resetInSec), ")"] })] }));
}
/** The masked display text for one secret field: `••••abcd`. */
function maskedText(secret) {
    if (secret === undefined || !secret.set || secret.tail.length === 0)
        return '';
    return `${MASK}${secret.tail}`;
}
/** Daily remaining average from the monthly window:
 * (100 - used%) / days-left. Returns null when unusable. */
function dailyRemaining(window) {
    if (window === undefined || window.resetInSec <= 0)
        return null;
    const days = window.resetInSec / 86400;
    if (days < 0.01)
        return null;
    return Math.max(0, 100 - window.percent) / days;
}
/** Severity of the daily remaining average: <3% err, <5% warn, ok green. */
function dailySeverityClass(daily) {
    if (daily < 3)
        return css.segErr;
    if (daily < 5)
        return css.segWarn;
    return css.segOk;
}
/**
 * The OpenCode Go usage chip: polls the host snapshot, renders the three
 * windows inline, and expands into a detail panel on click.
 * @param props - the composed dock entry props.
 */
export function OcgoDockEntry(props) {
    const [view, setView] = useState(null);
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    // Panel mode: 'view' = windows + footer; 'set' = workspace/cookie editor.
    const [mode, setMode] = useState('view');
    const [config, setConfig] = useState(null);
    const [wsDraft, setWsDraft] = useState('');
    const [cookieDraft, setCookieDraft] = useState('');
    const wrapRef = useRef(null);
    // --- Floating chip: drag, lock, and follow-the-input-card ----------------
    // The chip is positioned by hand (viewport-fixed coordinates) so it stays
    // glued to the composer input card while the sidebar width changes or the
    // page scrolls. All per-frame writes go to the DOM directly (no re-render);
    // React only owns the first paint via `pos` (the legacy storage key).
    const [pos, setPos] = useState(() => {
        try {
            const raw = window.localStorage.getItem('dsh.ocgoChip.pos');
            if (raw !== null) {
                const p = JSON.parse(raw);
                if (typeof p.x === 'number' && typeof p.y === 'number')
                    return { x: p.x, y: p.y };
            }
        }
        catch { /* ignore corrupt storage */ }
        return null;
    });
    const [locked, setLocked] = useState(() => window.localStorage.getItem('dsh.ocgoChip.locked') === '1');
    const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, baseLeft: 0, baseTop: 0 });
    const posRef = useRef(pos);
    posRef.current = pos;
    /** User offset of the chip relative to the input card (pixels).
     * DOM-controlled (no re-render per frame); persisted under
     * "dsh.ocgoChip.offset". The legacy "dsh.ocgoChip.pos" key is migrated
     * once during calibration. */
    const offsetRef = useRef(null);
    if (offsetRef.current === null) {
        try {
            const raw = window.localStorage.getItem('dsh.ocgoChip.offset');
            if (raw !== null) {
                const p = JSON.parse(raw);
                if (typeof p.x === 'number' && typeof p.y === 'number')
                    offsetRef.current = { x: p.x, y: p.y };
            }
        }
        catch { /* ignore corrupt storage */ }
    }
    /** Last DOM-applied viewport position (avoids redundant writes). */
    const chipStyleRef = useRef(null);
    /** Cached input-card element (re-found when detached). */
    const cardRef = useRef(null);
    /** Calibrate once per mount: express the chip's current position as an
     * offset relative to the input card (migrates the legacy pos key), then
     * hand position control over to the rAF follower below. */
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        if (wrap === null)
            return;
        const card = findCard(wrap);
        if (card === null)
            return;
        cardRef.current = card;
        if (offsetRef.current === null) {
            const wrapRect = wrap.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            offsetRef.current = {
                x: Math.round(wrapRect.left - cardRect.left),
                y: Math.round(wrapRect.top - cardRect.top),
            };
            try {
                window.localStorage.setItem('dsh.ocgoChip.offset', JSON.stringify(offsetRef.current));
            }
            catch { /* storage unavailable */ }
        }
        try {
            window.localStorage.removeItem('dsh.ocgoChip.pos');
        }
        catch { /* storage unavailable */ }
        if (posRef.current !== null)
            setPos(null);
    }, [visible]);
    /** Follow the input card every frame: the chip keeps the same pixel delta
     * from the card while the sidebar width changes or the page scrolls.
     * Writes are skipped while the position is unchanged. */
    useEffect(() => {
        let raf = 0;
        const loop = () => {
            raf = window.requestAnimationFrame(loop);
            const wrap = wrapRef.current;
            const offset = offsetRef.current;
            if (wrap === null || offset === null)
                return;
            let card = cardRef.current;
            if (card === null || !document.body.contains(card)) {
                card = findCard(wrap);
                cardRef.current = card;
                if (card === null)
                    return;
            }
            const cardRect = card.getBoundingClientRect();
            const x = Math.round(cardRect.left + offset.x);
            const y = Math.round(cardRect.top + offset.y);
            const prev = chipStyleRef.current;
            if (prev !== null && prev.x === x && prev.y === y)
                return;
            wrap.style.position = 'fixed';
            wrap.style.left = `${x}px`;
            wrap.style.top = `${y}px`;
            wrap.style.bottom = 'auto';
            chipStyleRef.current = { x, y };
        };
        raf = window.requestAnimationFrame(loop);
        return () => {
            window.cancelAnimationFrame(raf);
            chipStyleRef.current = null;
        };
    }, [visible]);
    const modeRef = useRef('view');
    modeRef.current = mode;
    const draftsRef = useRef({ ws: '', cookie: '' });
    draftsRef.current = { ws: wsDraft, cookie: cookieDraft };
    const configRef = useRef(null);
    configRef.current = config;
    // One periodic tick:
    //   1. resolve the session's CURRENT provider from the live in-memory
    //      selection (session.models, warm ~ms) and toggle `visible`;
    //   2. only while visible, fetch the usage snapshot.
    const pollNow = useCallback(() => {
        let live = true;
        const provider = props.provider;
        const resolveProvider = provider !== undefined
            ? Promise.resolve(provider()).then((p) => p ?? undefined, () => undefined)
            : Promise.resolve(undefined);
        resolveProvider.then((p) => {
            if (!live)
                return;
            const shown = isOpenCodeGo(p);
            setVisible(shown);
            if (!shown)
                setOpen(false);
            if (shown) {
                ocgoApi.view().then((snapshot) => {
                    if (live)
                        setView(snapshot);
                }, () => {
                    if (live)
                        setView(null);
                });
            }
        }, () => {
            if (live)
                setVisible(false);
        });
        return () => { live = false; };
    }, [props.provider]);
    useEffect(() => {
        const cleanup = pollNow();
        const timer = window.setInterval(pollNow, POLL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'visible')
                pollNow();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cleanup();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [pollNow]);
    /** Load the masked config into the editor drafts. */
    const loadConfig = useCallback(() => {
        ocgoApi.config().then((snapshot) => {
            setConfig(snapshot);
            setWsDraft(maskedText(snapshot.workspaceID));
            setCookieDraft(maskedText(snapshot.cookie));
        }, () => {
            // Editor still opens; drafts stay empty.
            setConfig(null);
            setWsDraft('');
            setCookieDraft('');
        });
    }, []);
    /** Submit any edited field; returns the write promise (fire-and-forget on blur). */
    const saveConfig = useCallback(() => {
        const current = configRef.current;
        const partial = {};
        if (current !== null) {
            const ws = draftsRef.current.ws.trim();
            if (ws.length > 0 && ws !== maskedText(current.workspaceID))
                partial.workspaceID = ws;
            const cookie = draftsRef.current.cookie.trim();
            if (cookie.length > 0 && cookie !== maskedText(current.cookie))
                partial.cookie = cookie;
        }
        else {
            // No baseline loaded (fetch failed): send whatever was typed.
            if (draftsRef.current.ws.trim().length > 0)
                partial.workspaceID = draftsRef.current.ws.trim();
            if (draftsRef.current.cookie.trim().length > 0)
                partial.cookie = draftsRef.current.cookie.trim();
        }
        if (Object.keys(partial).length === 0)
            return;
        ocgoApi.writeConfig(partial).then((snapshot) => {
            setConfig(snapshot);
            setWsDraft(maskedText(snapshot.workspaceID));
            setCookieDraft(maskedText(snapshot.cookie));
            // New credentials are live now (host invalidated its cache): poll now.
            pollNow();
        }, () => {
            // Ignore; the next poll resyncs and the editor keeps the drafts.
        });
    }, [pollNow]);
    /** Close the panel; in set mode a blur/close acts as confirm (save). */
    const closePanel = useCallback(() => {
        if (modeRef.current === 'set')
            saveConfig();
        setOpen(false);
        setMode('view');
    }, [saveConfig]);
    /** Open the editor (used by the Set button and the error chip). */
    const openSet = useCallback(() => {
        setMode('set');
        setOpen(true);
        loadConfig();
    }, [loadConfig]);
    /** Drag start: record the pointer origin and the chip's current card
     * offset. Locked chips are not draggable. */
    const onWrapMouseDown = (event) => {
        if (locked)
            return;
        const wrap = wrapRef.current;
        if (wrap === null)
            return;
        event.preventDefault();
        let offset = offsetRef.current;
        if (offset === null) {
            const card = findCard(wrap);
            if (card !== null) {
                const wrapRect = wrap.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                offset = {
                    x: Math.round(wrapRect.left - cardRect.left),
                    y: Math.round(wrapRect.top - cardRect.top),
                };
                offsetRef.current = offset;
                cardRef.current = card;
            }
            else {
                offset = { x: 0, y: 0 };
            }
        }
        dragRef.current = {
            active: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            baseLeft: offset.x,
            baseTop: offset.y,
        };
    };
    /** Toggle the drag lock (persisted under "dsh.ocgoChip.locked"). */
    const toggleLock = () => {
        setLocked((prev) => {
            const next = !prev;
            try {
                window.localStorage.setItem('dsh.ocgoChip.locked', next ? '1' : '0');
            }
            catch { /* storage unavailable */ }
            return next;
        });
    };
    /** Drag move/end listeners (window-scoped so the drag survives the pointer
     * leaving the chip). Positions are written straight to the DOM. */
    useEffect(() => {
        const onMove = (event) => {
            const d = dragRef.current;
            if (!d.active)
                return;
            const dx = event.clientX - d.startX;
            const dy = event.clientY - d.startY;
            if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3)
                d.moved = true;
            if (d.moved) {
                const offset = { x: d.baseLeft + dx, y: d.baseTop + dy };
                offsetRef.current = offset;
                const wrap = wrapRef.current;
                const card = cardRef.current;
                if (wrap !== null && card !== null) {
                    const cardRect = card.getBoundingClientRect();
                    wrap.style.left = `${Math.round(cardRect.left + offset.x)}px`;
                    wrap.style.top = `${Math.round(cardRect.top + offset.y)}px`;
                }
                document.body.style.cursor = 'grabbing';
            }
        };
        const onUp = () => {
            const d = dragRef.current;
            if (!d.active)
                return;
            d.active = false;
            document.body.style.cursor = '';
            if (d.moved) {
                d.moved = false;
                try {
                    window.localStorage.setItem('dsh.ocgoChip.offset', JSON.stringify(offsetRef.current));
                }
                catch { /* storage unavailable */ }
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);
    // Close the detail panel when focus leaves the chip: any pointer press
    // outside the wrapper, or Escape. In set mode this CONFIRMS (saves).
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) {
                closePanel();
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                closePanel();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, closePanel]);
    const refresh = () => {
        ocgoApi.refresh().then((snapshot) => {
            setView(snapshot);
        }, () => {
            // Ignore transport errors on manual refresh; the next poll resyncs.
        });
    };
    const t = props.t;
    const sep = ` ${t('ocgo.sep')} `;
    // Hidden whenever the live provider is not opencode-go — the pi-ocgo-usage
    // behaviour: switching to e.g. DeepSeek official hides the chip within one
    // poll interval, so no other provider's user sees OpenCode Go numbers.
    if (!visible)
        return null;
    const error = view === null ? { code: 'fetch', message: t('ocgo.error', { code: 'fetch' }) }
        : view.error !== undefined
            ? { code: view.error, message: view.message ?? t('ocgo.error', { code: view.error }) }
            : null;
    // Error state: the chip opens the Set editor directly so a stale cookie can
    // be replaced in place; clicking outside (or Esc) confirms the write.
    if (error !== null) {
        return (_jsxs("span", { className: css.wrap, ref: wrapRef, "data-testid": "ocgo-chip-error", style: pos === null ? undefined : { left: `${pos.x}px`, top: `${pos.y}px`, bottom: 'auto' }, onMouseDown: onWrapMouseDown, children: [_jsxs("button", { type: "button", className: open ? `${css.chip} ${css.chipOpen}` : css.chip, onClick: () => { if (open)
                        closePanel();
                    else
                        openSet(); }, title: `${error.message}\n${t('ocgo.set')}`, children: [t('ocgo.label'), ": <err:", error.code, ">"] }), open && (_jsx("span", { className: css.details, children: _jsxs("span", { className: css.setPanel, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.workspaceID') }), _jsx("input", { className: css.fieldInput, value: wsDraft, placeholder: "wrk_\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setWsDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.workspaceID))
                                            e.target.select(); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.cookie') }), _jsx("input", { className: css.fieldInput, value: cookieDraft, placeholder: "auth=\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setCookieDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.cookie))
                                            e.target.select(); } })] }), _jsxs("span", { className: css.foot, children: [_jsx("span", { className: css.setHint, children: t('ocgo.setHint') }), _jsx("button", { type: "button", className: css.refreshBtn, onClick: closePanel, children: t('ocgo.save') })] })] }) }))] }));
    }
    // TS: after the error early-return, `view` is a non-null success snapshot.
    const snapshot = view;
    const windows = [
        snapshot.rolling,
        snapshot.weekly,
        snapshot.monthly,
    ].filter((w) => w !== undefined);
    const daily = dailyRemaining(snapshot.monthly);
    const dailyCls = daily === null ? undefined : dailySeverityClass(daily);
    // No windows at all (e.g. brand-new account): show unavailable, refreshable.
    if (windows.length === 0) {
        return (_jsxs("button", { type: "button", className: css.chip, onClick: refresh, title: t('ocgo.refresh'), "data-testid": "ocgo-chip-empty", children: [t('ocgo.label'), ": ", t('ocgo.unavailable')] }));
    }
    return (_jsxs("span", { className: css.wrap, ref: wrapRef, "data-testid": "ocgo-chip", style: pos === null ? undefined : { left: `${pos.x}px`, top: `${pos.y}px`, bottom: 'auto' }, onMouseDown: onWrapMouseDown, children: [_jsxs("button", { type: "button", className: open ? `${css.chip} ${css.chipOpen}` : css.chip, onClick: () => {
                    if (dragRef.current.moved) {
                        dragRef.current.moved = false;
                        return;
                    }
                    if (open)
                        closePanel();
                    else
                        setOpen(true);
                }, title: open ? t('ocgo.collapse') : t('ocgo.expand'), children: [_jsxs("span", { children: [t('ocgo.label'), ":"] }), windows.map((w) => (_jsx(WindowSegment, { window: w, sep: sep }, w.kind))), daily !== null && (_jsxs("span", { className: css.seg, children: [_jsx("span", { className: css.segSep, children: sep }), _jsxs("span", { className: dailyCls ?? undefined, children: ["\u23F3 ", daily.toFixed(1), "%/\u5929"] })] })), snapshot.updatedAt !== undefined && (_jsxs("span", { className: css.segSep, children: [sep, t('ocgo.fetchedAt', { time: formatClock(snapshot.updatedAt) })] })), _jsx("span", { className: css.lockBtn, role: "button", title: locked ? '取消固定' : '固定', onClick: (e) => { e.stopPropagation(); toggleLock(); }, children: locked ? (_jsx("svg", { viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M18 6 6 18M6 6l12 12" }) })) : (_jsx("svg", { viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" }) })) })] }), open && (_jsx("span", { className: css.details, children: mode === 'set' ? (_jsxs("span", { className: css.setPanel, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.workspaceID') }), _jsx("input", { className: css.fieldInput, value: wsDraft, placeholder: "wrk_\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setWsDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.workspaceID))
                                        e.target.select(); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.cookie') }), _jsx("input", { className: css.fieldInput, value: cookieDraft, placeholder: "auth=\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setCookieDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.cookie))
                                        e.target.select(); } })] }), _jsxs("span", { className: css.foot, children: [_jsx("span", { className: css.setHint, children: t('ocgo.setHint') }), _jsx("button", { type: "button", className: css.refreshBtn, onClick: closePanel, children: t('ocgo.save') })] })] })) : (_jsxs(_Fragment, { children: [windows.map((w) => (_jsxs("span", { className: css.window, children: [_jsx("span", { className: css.windowLabel, children: w.status === 'rate-limited' ? t('ocgo.rateLimited') : t(WINDOW_TITLE_KEYS[w.kind]) }), _jsxs("span", { className: css.windowValue, children: [_jsxs("span", { className: severityClass(w) ?? undefined, children: [w.percent, "%"] }), _jsx("span", { className: css.windowReset, children: t('ocgo.resetsIn', { duration: formatDuration(w.resetInSec) }) })] })] }, w.kind))), _jsxs("span", { className: css.foot, children: [_jsx("button", { type: "button", className: css.setBtn, onClick: openSet, children: t('ocgo.set') }), _jsxs("span", { className: css.footRight, children: [_jsx("button", { type: "button", className: css.refreshBtn, onClick: refresh, children: t('ocgo.refresh') }), snapshot.updatedAt !== undefined && (_jsx("span", { className: css.fetchedAt, children: t('ocgo.fetchedAt', { time: formatClock(snapshot.updatedAt) }) }))] })] })] })) }))] }));
}
