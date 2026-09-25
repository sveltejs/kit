---
'@sveltejs/kit': patch
---

fix: set the focus starting point without a fragment navigation, which leaked a `hashchange` to app listeners
