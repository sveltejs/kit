# PR Plan — sveltejs/kit #16617

## Issue
`Promise.withResolvers()` in client remote-function runtime needs Safari 17.4 / Chrome 119 /
Firefox 121, but Vite 8's default build target is Safari 16.4 / Chrome 111 and is not polyfilled.
Affected files:
- `packages/kit/src/runtime/client/remote-functions/query/instance.svelte.js` (L103)
- `packages/kit/src/runtime/client/remote-functions/query-live/instance.svelte.js` (L81, L124, L355)

## Four signals (all pass)
- assignee: none
- open PR xref: none (only unrelated open PRs; #15510 which removed the old helper is MERGED)
- timeline cross-ref: only two comments + label events, no linked PR
- 21-day commit mention: none referencing withResolvers / 16617 / Safari

## Root cause
PR #15510 deleted `packages/kit/src/utils/promise.js` (`with_resolvers()` helper) in favour of
the native `Promise.withResolvers()`, on the assumption Node 22 minimum. That is true for
server/build-time call sites, but the three client call sites ship verbatim to browsers.

## Fix
Re-add the `with_resolvers()` helper to `packages/kit/src/utils/promise.js` (the same ~4-line
executor wrapper removed in #15510) and swap the four client call sites to use it. Server/build
call sites keep the native method.

## TDD evidence
- RED: new `with-resolvers.svelte.spec.js` sets `Promise.withResolvers = undefined` (simulating
  an older browser) and fails on current code:
  - Query returns `undefined` instead of `'value'`
  - LiveQuery throws `TypeError: Promise.withResolvers is not a function`
- GREEN: same test passes after the swap.
- Regression: full kit unit suite 58 files / 729 passed, 110 skipped.
- `pnpm -F @sveltejs/kit check` clean; `pnpm run lint` clean; `oxfmt --write` clean.

## Files changed
- packages/kit/src/utils/promise.js (new)
- packages/kit/src/runtime/client/remote-functions/query/instance.svelte.js
- packages/kit/src/runtime/client/remote-functions/query-live/instance.svelte.js
- packages/kit/src/runtime/client/remote-functions/with-resolvers.svelte.spec.js (new)
- .changeset/pre/remote-functions-no-withresolvers.md (new)

## Honesty notes
- Test simulates an old browser by stubbing `Promise.withResolvers` off, which reproduces the
  exact failure signature without a real Safari 16.4 browser (impossible in CI here).
- Full integration browser suite (`pnpm test:kit`) not run (requires Playwright browsers + long
  build); unit coverage is the relevant surface.
