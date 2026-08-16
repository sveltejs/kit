---
'@sveltejs/kit': patch
---

fix: restore `sync_store` to its previous value after `with_request_store` resolves in WebContainer (StackBlitz), preventing stale `is_in_remote_query: true` state from leaking into subsequent code and causing spurious "Cannot access event.url in a query" errors after `await query()`
