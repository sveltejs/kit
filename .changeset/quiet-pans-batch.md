---
'@sveltejs/adapter-vercel': patch
'@sveltejs/adapter-static': patch
---

fix: combine trailing slash redirects for prerendered pages into as few routes as possible when routes use different `trailingSlash` options, to avoid exceeding Vercel's route limit
