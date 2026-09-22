---
'@sveltejs/kit': patch
---

fix: don't touch the `query.live` stream controller after teardown, and make response cancellation observable via the generator's `request.signal`
