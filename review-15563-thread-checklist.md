# PR #15563 Review Thread Checklist

Reviewer: `elliott-with-the-longest-name-on-github`  
Review ID: `4057599859`  
PR: https://github.com/sveltejs/kit/pull/15563

## Investigation Context (Session Bootstrap)

Use this section to rehydrate context when starting a fresh session for any individual thread.

### What was investigated

- Commit analysis: full patch/stat review of `31c7504608d9930ce4ecb2b65f120dd3a57b9e63` (breaking: rework client-driven refreshes).
- PR review/thread discovery:
  - `gh api repos/sveltejs/kit/pulls/15563/reviews`
  - `gh api graphql` against `reviewThreads` (to get thread IDs, resolution state, file/line anchors, and replies)
  - Filtered specifically to review `4057599859` by `elliott-with-the-longest-name-on-github`, while also capturing follow-up responses from Rich/others in those same threads.
- Runtime architecture read-through to map fix surfaces:
  - `packages/kit/src/runtime/app/server/remote/query.js`
  - `packages/kit/src/runtime/server/remote.js`
  - `packages/kit/src/runtime/client/remote-functions/query.svelte.js`
  - `packages/kit/src/runtime/client/remote-functions/shared.svelte.js`
  - `packages/kit/src/runtime/client/remote-functions/form.svelte.js`
  - `packages/kit/src/runtime/client/remote-functions/command.svelte.js`
  - `packages/kit/src/runtime/client/client.js`
  - `packages/kit/src/exports/public.d.ts`
  - `packages/kit/types/index.d.ts` (reference only; generated artifact)

### Key architectural findings from `31c750460`

- Client-driven updates were redesigned into client-requested + server-accepted updates.
- `requested(query, limit)` is the server-side acceptance point for client requested refreshes.
- Client update payloads now flow through `RemoteQueryUpdate` and `categorize_updates(...)`.
- Query instance addressing moved to symbol-based metadata:
  - query function marker: `QUERY_FUNCTION_ID`
  - query instance marker: `QUERY_RESOURCE_KEY`
  - override release marker: `QUERY_OVERRIDE_KEY`
- Client query caching was moved to two-tier map structure (`query id -> payload -> entry`), which is critical for “all active instances” semantics.
- Refresh failures are isolated per query refresh key and reported back via refresh map rather than crashing the whole command.
- This architecture directly affects how live-query reconnect support should integrate with single-flight and with `requested(...)` design.

### Review-thread inventory outcome

- Total relevant open threads from this review: 15 active + 1 outdated reference.
- Thread themes:
  - API naming/docs clarity (`finished` semantics, typedef wording, reconnect docs)
  - invalidation and reconnect interaction (especially form + `invalidateAll`)
  - single-flight parity for live queries (including potential `requested(live_query, ...)` implications)
  - runtime robustness (await/reconnect recovery behavior, JSON line framing test coverage)
  - code quality follow-ups (DRYing parser logic, helper naming, file decomposition, symbol consistency)

### Important implementation constraints for future sessions

- Keep `packages/kit/types/index.d.ts` clean unless intentionally regenerated; avoid accidental formatting churn there.
- Any fix touching live-query update wiring should be cross-checked against:
  - command/form client paths (`updates(...)`, response application)
  - server serialization (`refreshes`, `reconnects`)
  - invalidation paths (`invalidateAll`, force invalidation behavior)
- When addressing a single thread, still sanity-check against adjacent unresolved threads to avoid introducing conflicts.

### Local working-tree note (current state)

- A draft implementation exists for thread `3034693951` (`finished` -> `completed`) across runtime/types/tests.
- That draft is intentionally not treated as approved yet; this checklist remains the source of truth for thread-by-thread approval.

## Context We Agreed To Keep In Mind

- [ ] Commit `31c750460` fully accounted for in each fix (`requested(...)`, two-tier query caching, `RemoteQueryUpdate`, symbol-based update plumbing, per-query refresh error isolation)

## Thread Checklist

- [x] `3034693951` (`PRRT_kwDOEiPr8c54zRd_`) — `packages/kit/src/exports/public.d.ts:2213`
  - Question: `finished` naming is confusing because reconnect can make it false again.
  - Current proposal: rename to `completed` and update usages/tests/docs.
  - Local state: implementation is already drafted in working tree; waiting for approval.
  - **Thread Session Template**
    - Goal: clarify live-query completion state naming so reconnect semantics are not ambiguous.
    - Scope guardrails: rename-only API surface for this thread; no broader reconnect behavior changes.
    - Touched files: `packages/kit/src/exports/public.d.ts`, `packages/kit/src/runtime/app/server/remote/query.js`, `packages/kit/src/runtime/client/remote-functions/query.svelte.js`, `packages/kit/test/types/remote.test.ts`, `packages/kit/test/apps/async/src/routes/remote/live/LiveView.svelte`.
    - Tests run: covered in committed thread-1 changeset.
    - Result: completed (`finished` -> `completed` with aligned runtime/types/tests usage).
    - User approval: approved and committed.

- [x] `3034696677` (`PRRT_kwDOEiPr8c54zR-i`) — `packages/kit/src/exports/public.d.ts:2235`
  - JSDoc wording for `RemoteLiveQueryFunction` should be clearer (“type of a live query function”).
  - Note: Rich suggested consistency with other remote-function typedef docs.
  - **Thread Session Template**
    - Goal: make remote function typedef JSDoc wording read as type descriptions, not runtime return values.
    - Scope guardrails: docs-only changes in typedef comments; keep API/types behavior unchanged.
    - Touched files: `packages/kit/src/exports/public.d.ts`.
    - Tests run: not run (comment-only change).
    - Result: drafted change replacing "The return value of..." with "The type of..." for `form`, `command`, `prerender`, `query`, and `query.live` typedef docs.
    - User approval: approved.

- [x] `3034708331` (`PRRT_kwDOEiPr8c54zUKy`) — `packages/kit/src/runtime/app/server/remote/query.js:474`
  - Add docs for reconnecting / single-flight reconnect semantics.
  - **Thread Session Template**
    - Goal: document how `query.live(...).reconnect()` is used from mutation handlers and clarify same-flight reconnect behavior.
    - Scope guardrails: documentation-only change; no runtime/type changes in this thread.
    - Touched files: `documentation/docs/20-core-concepts/60-remote-functions.md`.
    - Tests run: not run (docs-only change).
    - Result: drafted new subsection under single-flight mutations with a `form` example calling `getNotifications(user_id).reconnect()` and explanatory text.
    - User approval: approved.

- [x] `3034720898` (`PRRT_kwDOEiPr8c54zWt5`) — `packages/kit/src/runtime/client/remote-functions/form.svelte.js:243`
  - Align reconnect behavior with `invalidateAll`.
  - Expected direction from thread: yes to reconnecting live queries when invalidating, and yes to suppressing default invalidate-all when explicit reconnect handling is present.
  - **Thread Session Template**
    - Goal: align live-query reconnect semantics with `invalidateAll` and form post-submit fallback invalidation behavior.
  - Scope guardrails: minimal runtime changes in form and invalidation flow only; no API surface changes.
  - Touched files: `packages/kit/src/runtime/client/remote-functions/form.svelte.js`, `packages/kit/src/runtime/client/client.js`, `packages/kit/test/apps/async/src/routes/remote/live/live.remote.js`, `packages/kit/test/apps/async/src/routes/remote/live/+page.svelte`, `packages/kit/test/apps/async/test/client.test.js`.
  - Tests run: `npx playwright test --grep "form reconnect updates targeted live query"` in `packages/kit/test/apps/async` (passed in build mode; no-js variant skipped as expected for this client behavior test).
  - Result: drafted runtime changes plus a regression test proving form-driven reconnect targets only requested live queries and does not trigger global live-query reconnects via fallback invalidation.
  - User approval: approved.

- [ ] `3034727047` (`PRRT_kwDOEiPr8c54zX6V`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:95`
  - Ensure single-flight updates support `updates(live_query_function)` and integration path for `requested(live_query, ...)`.
  - Depends heavily on `31c750460` architecture (two-tier cache + symbol metadata).
  - **Thread Session Template**
    - Goal: support `updates(live_query_function)` in command/form single-flight updates and ensure server-side `requested(live_query, ...)` can consume those requested keys.
    - Scope guardrails: keep changes within update categorization, live-query metadata wiring, and focused async app regression coverage.
    - Touched files: `packages/kit/src/runtime/client/remote-functions/query.svelte.js`, `packages/kit/src/runtime/client/remote-functions/shared.svelte.js`, `packages/kit/test/apps/async/src/routes/remote/live/live.remote.js`, `packages/kit/test/apps/async/src/routes/remote/live/+page.svelte`, `packages/kit/test/apps/async/test/client.test.js`.
    - Tests run: `npx playwright test --grep "command updates(live_query_function) can request reconnect via requested(...).reconnectAll"` in `packages/kit/test/apps/async` (build mode passed; no-js variant skipped).
    - Result: in progress — live query functions now carry function-id metadata, update categorization resolves both query/live active instances by id, and async app fixture adds command+UI path for `requested(get_count).reconnectAll()` driven by `updates(get_count)`.
    - User approval: pending.

- [ ] `3034730253` (`PRRT_kwDOEiPr8c54zYhn`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:443`
  - Validate correctness of current control flow (edge case around early redirect/auth guard patterns in live query generators).
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034733514` (`PRRT_kwDOEiPr8c54zZJk`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:434`
  - Refactor: move stream-reader helpers out of oversized file.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034735625` (`PRRT_kwDOEiPr8c54zZiz`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:522`
  - DRY repeated response parsing logic in stream handling.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034736334` (`PRRT_kwDOEiPr8c54zZq-`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:480`
  - Add test coverage for JSON/newline framing behavior in NDJSON parsing.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034746072` (`PRRT_kwDOEiPr8c54zbhu`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:476`
  - Use shared/global `text_decoder` instead of constructing one per reader.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034748330` (`PRRT_kwDOEiPr8c54zb7_`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:550`
  - Rename stream functions for clearer semantics (`get_*` vs `create_*`).
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034751338` + `3034751693` (`PRRT_kwDOEiPr8c54zcfe`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:592`
  - Replace legacy `_key` usage with symbol-based property access consistent with `requested`-era design.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034755446` (`PRRT_kwDOEiPr8c54zdOI`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:591`
  - Fix recovery bug: `await live_query` can remain permanently rejected after first connection failure.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034774406` (`PRRT_kwDOEiPr8c54zgny`) — `packages/kit/src/runtime/client/remote-functions/query.svelte.js:1046`
  - Cleanup redundant cast/typing noise around override wiring (`entry.resource.withOverride(fn)`).
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

- [ ] `3034777731` (`PRRT_kwDOEiPr8c52Ns8p`) — `packages/kit/src/runtime/server/remote.js:125`
  - Reconnect behavior for command/form responses should mirror SSR-style first-value coordination (avoid staggered post-command reconnect uncertainty).
  - Follow-up raised in thread: consider how this changes `requested(...)` API surface for live vs non-live query function arguments.
  - **Thread Session Template**
    - Goal:
    - Scope guardrails:
    - Touched files:
    - Tests run:
    - Result:
    - User approval:

## Outdated / Superseded Threads (for reference)

- [ ] `3034774089` (`PRRT_kwDOEiPr8c54zgkW`) — outdated in current diff; tracked only as historical context.
