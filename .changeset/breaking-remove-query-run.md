---
'@sveltejs/kit': minor
---

breaking: the `.run()` method has been removed from regular (non-live) remote queries on both the client and the server. Use `await query()` directly instead — it now works everywhere. `.run()` remains on live queries, where it provides an explicit AsyncGenerator API.
