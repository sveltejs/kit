---
'@sveltejs/kit': patch
---

fix: use `behavior: 'instant'` for all navigation scroll calls to prevent interference from CSS `scroll-behavior: smooth`
