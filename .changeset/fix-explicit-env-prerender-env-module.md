---
'@sveltejs/kit': patch
---

fix: only reference `env.js` and `env.script.js` from prerendered pages and service workers if dynamic public env vars are in use, and emit them as prerender output so static hosts can serve them
