---
'@sveltejs/kit': patch
---

fix: don't treat `$lib/server.ts` or `$lib/server_whatever.ts` as server-only modules, only `$lib/server/**`
