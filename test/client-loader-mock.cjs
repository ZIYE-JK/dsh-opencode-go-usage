// Offline harness: replays the DSH ClientModuleSystem contract against
// lib/client.js, so a broken client bundle is caught here instead of inside the
// live GUI (the 2026-08-28 guardrail). It also exercises the bundle's real
// exports, so "the bundle loaded" is backed by executed code, not just a parse.
//
//   node client-loader-mock.cjs [path/to/lib/client.js]
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const clientPath = process.argv[2] ?? path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(clientPath, 'utf8')

// --- minimal React stub: the bundle only touches these at render time ---
const ReactStub = {
  createElement: (...args) => ({ __el: true, args }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useRef: (init) => ({ current: init }),
  useEffect: () => {},
  useLayoutEffect: () => {},
  useCallback: (fn) => fn,
}
const jsx = () => ({ __el: true })

const table = new Map([
  ['react', ReactStub],
  ['react/jsx-runtime', { jsx, jsxs: jsx, Fragment: 'Fragment' }],
])
const requireFn = (spec) => {
  if (table.has(spec)) return table.get(spec)
  throw new Error(`mock: require("${spec}") missed the module table`)
}

// --- window.__ModuleLoader__ sink + the two browser APIs the factory needs ---
const localStorageStub = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let handoff = null
const sandbox = {
  window: {
    __ModuleLoader__: { load: (h) => { handoff = h } },
    localStorage: localStorageStub,
  },
  document: {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '' }),
    head: { appendChild: () => {} },
  },
  fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  console,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(source, sandbox, { filename: 'client.js' })

const problems = []
const ok = (cond, message) => { if (!cond) problems.push(message) }

ok(handoff !== null, 'bundle never called window.__ModuleLoader__.load')
if (handoff !== null) {
  ok(handoff.id === 'dsh-ocgo-usage', `handoff id = ${String(handoff.id)}`)
}

let exportsObj = null
try {
  exportsObj = handoff.factory(requireFn)
} catch (err) {
  console.error(`FAIL: factory materialization threw: ${err && err.message}`)
  process.exit(1)
}

// --- exported shape (this plugin has no `name` export: the loader id rules) ---
ok(exportsObj !== null && typeof exportsObj === 'object', 'factory did not return an exports object')
ok(Array.isArray(exportsObj?.inject), 'exports.inject is not an array')
ok(exportsObj?.inject?.length === 2 && exportsObj.inject[0] === 'slots' && exportsObj.inject[1] === 'locale',
  `exports.inject = ${JSON.stringify(exportsObj?.inject)}`)
ok(typeof exportsObj?.apply === 'function', 'exports.apply is not a function')
ok(typeof exportsObj?.OcgoDockEntry === 'function', 'exports.OcgoDockEntry is not a component function')
ok(typeof exportsObj?.formatDuration === 'function', 'exports.formatDuration is not a function')

// --- executed code, not just a parse: real export behaviour ---
if (typeof exportsObj?.formatDuration === 'function') {
  ok(exportsObj.formatDuration(45) === '45s', `formatDuration(45) = ${exportsObj.formatDuration(45)}`)
  ok(exportsObj.formatDuration(5400) === '1h 30m', `formatDuration(5400) = ${exportsObj.formatDuration(5400)}`)
}
ok(typeof exportsObj?.OCGO_PROVIDER === 'string' && exportsObj.OCGO_PROVIDER.length > 0, 'exports.OCGO_PROVIDER is empty')

// --- render the chip once (error state) to prove the component body runs ---
if (typeof exportsObj?.OcgoDockEntry === 'function') {
  try {
    const tree = exportsObj.OcgoDockEntry({ t: (key) => key, provider: async () => 'opencode-go' })
    ok(tree !== null && tree !== undefined, 'OcgoDockEntry returned nothing')
  } catch (err) {
    problems.push(`OcgoDockEntry(props) threw: ${err && err.message}`)
  }
}

// --- apply(ctx): register the composer-dock entry ---
const calls = []
const scope = {
  effect: (fn, label) => { calls.push(`scope.effect:${label}`); const dispose = fn(); if (typeof dispose === 'function') dispose() },
  slots: {
    register: (opts, component) => {
      calls.push(`slots.register:${opts.name}/${opts.id}/${opts.order}`)
      if (typeof component !== 'function') throw new Error('registered occupant is not a component function')
      return () => {}
    },
  },
  get: () => undefined,
}
const mockCtx = {
  effect: (fn, label) => { calls.push(`effect:${label}`); const dispose = fn(); if (typeof dispose === 'function') dispose() },
  locale: { register: (ns) => { calls.push(`locale.register:${ns}`); return () => {} } },
  inject: (services, fn) => { calls.push(`inject:${services.join(',')}`); fn(scope) },
}
try {
  exportsObj.apply(mockCtx)
} catch (err) {
  console.error(`FAIL: apply(ctx) threw: ${err && err.message}`)
  process.exit(1)
}

const expected = [
  'effect:dsh-ocgo-usage: dictionaries',
  'locale.register:ocgo',
  'inject:slots,conversation,connection',
  'slots.register:conversation.composer.dock/ocgo-usage/110',
]
for (const call of expected) {
  if (!calls.includes(call)) problems.push(`expected call missing: ${call}`)
}

if (problems.length > 0) {
  console.error('FAIL:\n  - ' + problems.join('\n  - '))
  console.error('calls: ' + calls.join(' | '))
  process.exit(1)
}

console.log(`PASS: ${path.basename(clientPath)} loads, materializes, renders and registers cleanly`)
console.log('calls: ' + calls.join(' | '))
