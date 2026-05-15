---
'@sveltejs/kit': minor
---

breaking: the `.run()` method has been removed from remote queries on both the client and the server. Use `await query()` directly instead — it now works everywhere
