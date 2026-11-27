---
'@sveltejs/kit': patch
---

fix: create the history record for an entry reached by back/forward navigation, so that leaving an entry whose record was never persisted no longer throws and stops the router
