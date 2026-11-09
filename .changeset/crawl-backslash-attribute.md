---
'@sveltejs/kit': patch
---

fix: stop the prerender crawler from treating a backslash as an escape inside quoted attribute values, which made it skip the links after an attribute ending in `\`
