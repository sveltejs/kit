---
'@sveltejs/kit': patch
---

fix: settle `query.live` reconnect promise on all exit paths, preventing `invalidateAll()` from deadlocking when a live query is offline or interrupted
