---
'@sveltejs/kit': patch
---

add $app and $env to optimizeDeps.exclude so that libraries using these work correctly when prebundled
