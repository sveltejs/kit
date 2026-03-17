# query.live implementation plan

- [ ] 1. Types + public API surface
  - [ ] Add `query.live` to server/runtime exports and remote client factory mapping
  - [ ] Extend internal remote type unions with `query_live`
  - [ ] Add public live query types and `$app/server` declarations

- [ ] 2. Server-side primitive
  - [ ] Implement `query.live(...)` overloads with the same validation semantics as `query` and `query.batch`
  - [ ] Enforce callback returns an `AsyncIterator`/`AsyncIterable`
  - [ ] SSR await behavior: read first yielded value, then stop iteration via `return()`

- [ ] 3. Live remote endpoint
  - [ ] Handle `query_live` in server remote dispatcher
  - [ ] Return a streaming `ReadableStream` response
  - [ ] Ensure abort/disconnect calls iterator `return()` for cleanup

- [ ] 4. Client live resource
  - [ ] Add live query resource implementation in `query.svelte.js`
  - [ ] Connect while active instances exist; disconnect when inactive
  - [ ] Expose `connected` and `reconnect()`
  - [ ] Implement automatic reconnect with exponential backoff + jitter
  - [ ] Resume reconnect attempts on `online` event

- [ ] 5. Tests
  - [ ] Extend async app fixtures/routes for deterministic live updates and cleanup checks
  - [ ] Add SSR + CSR tests for first value, streaming updates, disconnect cleanup
  - [ ] Add reconnect tests (drop + manual reconnect + online resume)
  - [ ] Add validation coverage for `query.live`
  - [ ] Add TypeScript type tests for `query.live` signatures and resource shape

- [ ] 6. Docs + verification
  - [ ] Document `query.live` in remote functions docs
  - [ ] Run focused tests and fix regressions
