---
'@sveltejs/kit': patch
---

fix: let Vite's client take over the styles inlined during development instead of replacing them on hydration, which re-created their font faces
