---
"@sveltejs/kit": minor
---

breaking: `requested(query)` now yields `{ arg, query }` entries instead of the validated argument. 

Each `query` is a `RemoteQuery` bound to the client's original cache key, which ensures `refresh()` / `set()` update the correct client instance even when the query's schema transforms its input.

Before:

```js
for (const arg of requested(getPost, 5)) {
  void getPost(arg).refresh();
}
```

After:

```js
for (const { arg, query } of requested(getPost, 5)) {
  void query.refresh();
  // use `arg` for any side effects (e.g. DB writes)
}
```

`refreshAll()` is unchanged.
