---
'@sveltejs/kit': minor
---

Layout modules (+layout.js, +layout.server.js) can now export gate = true to block all descendant load functions from starting until the layout's own load resolves. Useful for auth guards and other layout-level checks that must complete before child data is fetched.
