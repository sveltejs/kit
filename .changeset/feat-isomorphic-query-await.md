---
'@sveltejs/kit': minor
---

feat: remote queries can now be awaited in any context (event handlers, module scope, async callbacks), not just inside reactive contexts. The cache is shared across reactive and non-reactive subscribers, so awaiting a query in an event handler will dedupe with components that have already subscribed to the same query.
