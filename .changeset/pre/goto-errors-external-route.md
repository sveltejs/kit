---
'@sveltejs/kit': major
---

breaking: `goto` now rejects when called with a URL that does not resolve to a route within the app, matching the existing behaviour for external URLs