---
'@sveltejs/kit': patch
---

fix: throw when a remote form's file is coerced to a string, instead of silently sending `[object Object]`
