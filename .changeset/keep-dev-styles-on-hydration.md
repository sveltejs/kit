---
'@sveltejs/kit': patch
---

fix: keep the top-level `@font-face` rules of the styles inlined during development through hydration while Vite's styles declare the same rules, so that their fonts aren't loaded again
