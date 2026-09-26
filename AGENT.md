# AGENT.md — PawaJS

Context for any AI agent (or new contributor) working in this codebase. Read this before making changes — several of the rules below exist because of real bugs found and fixed during development, not theoretical concerns.

---

## What PawaJS is

PawaJS is a **reactive web runtime** — not a virtual-DOM framework. Its identity, unchanged across the whole rewrite:

- **Extends the browser rather than replacing it.** HTML with directive attributes (`if`, `for-each`, `state-*`, `@{ }`) is the interface. No JSX, no compiler, no build step required to author with it.
- **No VDOM, no diffing pass.** Reactive effects (`createEffect`) wire directly to the specific DOM node/attribute that needs to change. An update touches only what changed.
- **Fine-grained reactivity**, structurally close to Vue 3's own core (`track`/`trigger`/`activeEffect`, a `WeakMap` of target → key → effect `Set`) — but the rendering strategy on top of it is closer to Solid's (no VDOM, direct DOM wiring).
- **Components are synchronous by default.** There is no async-component mode (`useAsync`/`$async` are removed). All async lives in the `await` / `as-fallback` / `as-catch` directives.

## The one organizing question

Nearly everything non-trivial in this codebase — rendering, SSR pruning, `.client` detection, what goes in the continuity payload — reduces to the same question, asked at different points in the pipeline: **did this specific evaluation touch reactive state (a Proxy read)?**

- At render time: decides whether something gets wrapped in `createEffect` at all.
- At SSR time (`isProxy`): decides whether a component becomes `.client`, and whether a given prop/expression needs to be sent to the client at all.
- At payload-build time: decides whether a construct earns a JSON entry — gated down to individual props and hook calls, not just per-component.

When adding a new construct or directive, ask this same question before inventing new detection logic. It is very likely the answer is "reuse `isProxy`," not "write a new check."

---

## Package layout

- **`pawajs` (core)** — the reactive engine, Graph/render system, control-flow directives, component handling, built-ins (`Active`, `Transition`). No SSR code, no `linkedom`. Ships to the client. Current size: **6.6kB gzipped** (down from 17.7kB pre-rewrite, with more capability — see `bundlephobia.com/package/pawajs`).
- **`pawa-ssr`** — server-side render pass. Produces HTML + a continuity JSON payload (SCP). Depends on `linkedom` for server-side DOM. Never ships to the client.
- **`pawajs-continue`** — client-side resumer (`PawaContinue`). Consumes the HTML + JSON pair `pawa-ssr` produces and attaches live reactivity without re-rendering.
- **`pawajs-dom-router`** — pure client-side router. No server involvement past initial load.
- **`supapawajs`** — full-stack meta-framework on Express. Owns delivery strategy: normal SSR, streaming, or SSG. Calls `pawa-ssr`/`pawajs-continue` but doesn't duplicate their logic. Route navigation fetches data only — it does **not** re-invoke `pawaServer`.
- **`pawajs-vite-plugin`** — build tooling, HMR, state preservation across reloads.

`pawa-ssr` and `pawajs-continue` don't know about delivery mode (streamed vs. cached vs. per-request) — that's entirely `supapawajs`'s job. Keep that boundary intact.

---

## Core reactivity (`reactive.js`)

- `track`/`trigger`/`activeEffect`, `targetMap: WeakMap<target, Map<key, Set<effect>>>`.
- **Every effect re-run must clear its own prior subscriptions before re-tracking.** `cleanupEffect(effect)` runs at the top of every effect invocation, unsubscribing from every dep set the effect was in from its *previous* run, so stale dependencies never accumulate. This was a real historical bug — don't reintroduce a version of `createEffect` that skips this.
- **Dead effects are tracked via a flag (`effect._killed`), not a global `Set`.** `stopEffect`/the `deletes` closure from `createEffect` set `_killed = true`; `trigger`/`runEffectNow` check the flag. There used to be a module-level `deleteEffect` Set that only grew — don't resurrect that pattern.
- **`graph.unActive`** — effects deferred while their owning `Graph` node is inactive (see `Active`, below) get pushed here by `runEffectNow` and flushed via `queueEffect`/`setTimeout` when the graph reactivates. Each `Graph` node owns its own `unActive`/timer list — never share one across nodes (see reentrancy note below).

### Reentrancy — a recurring bug class, watch for it

Several real bugs today were the same shape: **a single module-level mutable variable standing in for what should be call-scoped or per-node state**, unsafe under nesting or reentrant calls (`inProxy`, `transfer`/`schedule`, `store`/`useStorage`, `Active`'s single shared `timer`). The fix pattern is `withSlot` (save previous value, set new, run, restore previous in `finally`) or — better — moving the state onto the specific object it belongs to (e.g., `Active`'s timers now live on `g.timers` per-graph-node, not one shared array). When adding new module-level state that gets mutated inside a callback, ask: **can this function be called while another call to the same function is still in progress (nested or nearly-concurrent)?** If yes, it needs `withSlot` or per-instance storage, not a bare `let`.

---

## The Graph model (`graph/graph.js`)

Every dynamic construct (`condition`, `for-each` item, `component`, `template`, `key`) gets a `Graph` node: `{ref, children, parent, move, insertAfter, getElement, remove, killDown, ...}`.

- **`ref`** can point to: a real DOM node, another `Graph` node (recursive — chase via `getElement()`), or be temporarily unset. `getElement()` walks the `ref` chain recursively until it finds a concrete node. This is the mechanism that lets deeply nested constructs collapse to a single anchor instead of needing bracket-comment pairs at every level.
- **`move(anchor)`** repositions a node's DOM before `anchor`. **`insertAfter`-style methods must mirror `move`'s recursive structure** (template-node branch vs. direct-ref branch) — don't hardcode a single anchor node inside a helper like `createItem`; always thread the current anchor through, or moves will silently land in the wrong position (see `for-each` reconciler notes below).
- **Directionality matters.** `insertBefore(el, anchor)` puts `el` before `anchor`; `anchor.after(el)` (or an `insertAfter` graph method) puts it after. Getting this backwards is a real, easy-to-make mistake — verify against a 3+ item sequence by hand or by testing, not by reading the code once.

---

## `for-each` reconciliation

`for.js`'s `initializer` does keyed, LIS-based reconciliation — not naive full-rebuild:

1. On each evaluate, compare old key order to new key order (`sameArrangement` check). **If identical, do nothing — zero DOM cost.** This is the common case (an unrelated dependency triggered the effect) and must stay free.
2. If the arrangement changed, compute the **longest increasing subsequence** of old-indices among surviving keys. LIS members are already in correct relative order and are *not* moved.
3. Walk backward (`i = length-1` down to `0`), maintaining a **running anchor** (starts at the `comment`, updated to each processed item's own element after handling it) — never anchor every move against one fixed node. Anchoring everything against a single fixed node breaks correctness the moment some items are skipped (stable/LIS) and others aren't.
4. `createItem` must accept and insert against the **passed-in anchor**, not a hardcoded `comment`. A hardcoded anchor in `createItem` was a real bug: it caused a second newly-created item to land behind the first instead of in its correct position.
5. New pushes should land visually **after** the current last item (`children[length-1]`), matching `array.push()` intuition — this requires `.after()`, not `insertBefore`, when re-anchoring the marker comment (getting the direction backward here was also a real, caught bug).
6. `enqueueUpdate` chains updates through a promise (`updatePromise`) so overlapping triggers (e.g., two removals in quick succession, each awaiting exit-animation time via `Transition`) queue correctly instead of racing. This path is less thoroughly tested than the single-update case — see Testing below.

When touching this file: **test with a running app, not just by reading the diff.** Every bug in this reconciler so far was only caught by actually running append/swap/remove/reinsert/filter sequences, never by code review alone.

---

## SSR / Continuity (SCP — Server Continuation Protocol)

The core idea: SSR produces (a) real HTML with `p:id` attributes marking construct boundaries, and (b) a flat, id-keyed JSON payload carrying only what's genuinely needed to resume without recomputation. The client resumer (`pawajs-continue`) walks the JSON, not the DOM — one targeted lookup per entry via `p:id`, never a DOM traversal.

### Payload principles — do not violate these when adding a new construct

- **Flat, not tree-shaped.** No nested structural encoding in the JSON — position/ownership is discovered via `p:id` lookups and explicit `forkey` tags, not by JSON nesting. This is what keeps the format backend-portable (any language can emit a flat object; no language-specific tree-shape assumptions).
- **Gated by proxy-touch, at the finest available granularity.** A construct earns a JSON entry only if `isProxy` fired true for its evaluation — not because it's "inside a client boundary," not because its type is usually reactive. This applies down to individual props and hook calls on components, not just whole components.
- **`id` is a pure lookup handle. `key` is diff identity.** Never conflate them. A `for-key` item's `id` is how the resumer finds its DOM node; its `key` is what a future array diff uses to decide "same item, moved" vs. "new item."
- **`hydrate.ref` follows one of two patterns**, and both are legitimate — know which one you're in:
  - **Sentinel (`ref: "ref"`)**: "resolve by chasing into children/self" — used by `condition`, `await`, `template`, `component` boundaries that don't correspond to a single fixed element yet.
  - **Direct (`ref: "<own id>"`)**: the construct's own element is the final anchor (most components, `state`, `Active`-style self-binding via `useRef()`).
  - Note: `ref="ref"` as a literal *HTML attribute* is a completely different thing — it's `useRef()`'s own binding syntax (the string is the JS variable name), unrelated to the hydrate sentinel. They share a string value coincidentally, not semantically.
- **Every hydrate node needs a `type` field.** The resumer dispatches on it. Don't add a construct type without one — relying on field-shape inference instead of an explicit `type` was a real gap that got fixed; don't reintroduce it.
- **`resolved` (on `await` nodes) means "settled and ready to attach," not "succeeded vs failed."** Success/error is carried by which branch's HTML actually rendered (`awaits` vs `awaitError`), not by this field — both branches correctly set `resolved:true`.
- **`forkey`** tags a nested construct with its owning `for-each` item's key, so a flat `children` array under a `for-each` node can still be correctly attributed per-item without nesting. Only relevant when the parent hydrate node looks like a for-each (`hydrate?.arrayName` present).
- **Region ownership, not per-element ids.** `p:id` marks the boundary of a *construct's region* — everything inside (plain, non-reactive content) shares that id. Don't expect one id per DOM node; expect one id per independently-resolvable reactive unit.

### Per-construct resume strategy — don't unify these into one code path

- **`condition` / `for-each`** — genuinely paused: seed comparison state (`oldChain`/`current`, keyed `children`) from JSON, skip the first `evaluate()` entirely (`isHydrate?.enter` check), resume real computation only at the next genuine trigger.
- **`await`** — resolved/error value handed straight into context via the same merge `apply()` uses live. The promise function is never called. Retry (if the app needs it) goes through a `Key`-forced remount at the parent, not a bespoke retry mechanism inside `Await` itself.
- **`component`** — re-executes in full on the client (cheap; accepted cost) to rebuild `useInsert` context and effects, but the returned HTML string is discarded — the component attaches to the already-correct SSR element found via `p:id`, never rebuilding DOM.
- **`only-client`** — opts out of SSR entirely. Ships as an inert `<template on-client>` for the client to instantiate fresh. No JSON entry, since nothing was evaluated server-side.
- **`state-*` attributes** — SSR-evaluated inline; the resolved value **must** be sent (nothing re-derives it). Component-*internal* `$state` calls (inside a component's JS body) do **not** need to be sent — the component's re-execution naturally reproduces them for free. Don't send both; sending the internal ones is pure duplication.

### Detection: `.client` / `force` / auto-inheritance

A component is treated as client if **any** of:
1. Registration-time flag (`Component.client = true` on the function itself — e.g. `Active`, `Transition`).
2. Internal hook usage (`$state`, `stateWatch`) — calling a client-reactive hook is itself what marks the component client, as a side effect of the call, via `AsyncLocalStorage`-scoped detection during SSR.
3. Ancestor is client (transitive through non-client intermediaries).
4. **`force`** — an SSR-time template directive (`el.hasAttribute('force')`), scoped per usage site, not a static component property. Exists specifically for the one case `isProxy` structurally cannot see: a function value (event handler, callback) passed as a prop or into `useInsert`'s context. Calling a function during SSR never executes its body, so state read *inside* that function is invisible to proxy-touch detection — `force` is the deliberate escape hatch, applied at the exact call site that needs it.

Once a component is client for any reason, **nested components under it do not need repeated manual `force` calls** just because they also carry function-valued context — a check inside already-confirmed client boundaries handles function-valued `useInsert`/context entries automatically. `force` is only for establishing the boundary in the first place, not for every nested case beneath it.

`$state` cannot be called in a component that isn't (or doesn't become) client — calling it is what makes a component client, there's no separate permission check.

### Streaming

Raw chunked HTTP, not SSE. First chunk: fully resolved content + placeholders (`awaitsLoading`, `resolved:false`) for pending `await`s. Each pending item resolves independently and flushes its own chunk with an inline `<script>` on settling — never waits for siblings. Client/server rendezvous is a flat, id-keyed handshake (`window.awaits[id]` / `window.states[id]`): whichever side (server chunk arriving, or client resumer walking to that point) gets there *second* consumes what the *first* side left behind. Neither side polls or waits.

---

## Directive reference (current, post-rewrite)

- `if` / `else` / `else-if` — conditional rendering. (`switch`/`case`/`default` are **removed**.)
- `for-each` + `for-key` — keyed list rendering (see reconciliation notes above).
- `state-*` — inline reactive state scoped to an element and its children.
- `await` / `as-fallback` / `as-catch` — async handling. `await` must be given a **function that returns a promise**, never an already-invoked call (`await="fetchUser"`, not `await="fetchUser()"`). `as="name"` binds the resolved/caught value under a custom name (defaults: `res` / `error`).
- `key` — forces a full remount when its watched value changes. Used as the retry mechanism for failed `await`s (force a parent `Key` change rather than building retry into `Await`).
- `on-<event>` / `out-<event>` — event handling, with `.self`/`.prevent`/`.once`/`.capture` chain modifiers.
- `:prop` — reactive component prop.
- `<slot>` / `<slot name="...">` — content projection (not a `children` prop — this changed in the rewrite).
- `<template prop="name">` — pass a raw string/markup chunk as a prop value.
- `aschild` — component's root element merges into (rather than wraps) what the caller passed.
- `ref` — bind a `useRef()` object to an element. Unrelated to the SCP hydrate sentinel of the same string value — see note above.
- `force` — SSR directive forcing a component to client status at this usage site (see Detection above).
- ~~`is-exit`~~ — **removed.** Superseded by `Transition`'s own `onExit`/`onEnter` graph hooks, which wait for the exit animation before actual DOM removal automatically.
- ~~`useServer`, `useAsync`/`$async`~~ — **removed.** No async-component mode; use `await`/`as-fallback`/`as-catch` instead.

## Built-in components

- **`Active`** — `:show="expr"` controls visibility (`display:none`) and pauses/resumes reactive effects underneath while hidden (via `graph.active` + `graph.unActive`, see reactivity notes above). Always client (`Active.client = true`).
- **`Transition`** — `:enter`/`:exit` (class-name arrays or inline style-string arrays, same shape as `el.animation()`) + `:duration` (default 300ms). Waits for the exit animation to finish before the element is actually removed. Always client.

---

## Testing conventions

There is no automated correctness harness yet (SSR-render → resume → compare against fresh client render is a known, not-yet-built gap — high priority if adding one). Until it exists:

- **Trust real, running output over code review for anything touching the reconciler, the Graph model, or resume seeding.** Every bug caught in these areas during development was found by actually running sequences (append/remove/reorder/filter), never by reading the diff.
- When testing `for-each` changes, exercise at minimum: append, remove-from-middle, filter-then-restore (items reappearing at original relative position), multi-item reorder (not just single swaps), and rapid back-to-back updates (overlapping `enqueueUpdate` calls, especially with `Transition`'s exit-animation delay in play).
- When testing SSR/continuity changes, check real payload output for: correct `type` per node, correct `resolved` semantics on `await`, `p:id` region boundaries matching expectations, and — critically — that pruning is actually happening (static/non-reactive content should produce **zero** hydrate entries, not just small ones).

---

## Things intentionally *not* built yet — don't assume otherwise

- No automated resume-correctness harness.
- No second (non-JS) backend implementation of SCP — portability is a design property, not yet a proven one.
- No dev-mode warning system beyond the initial `stripComponent` (statically-pruned-but-in-a-client-boundary) warning — a broader dev-mode/error-handling pass is planned but not started.
- No PML (partial re-render / DOM morph after initial resume) — designed in concept (compare live Graph tree against a parsed incoming tree, route first-boundary component updates through `reProps` rather than DOM diffing) but unimplemented.
- No large-list payload/perf measurement has been taken yet — treat "for-each cost at scale" as an open, unmeasured question, not a solved one.