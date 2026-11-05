---
'@sveltejs/enhanced-img': patch
---

fix: compute the missing `width` or `height` at runtime for images imported in the script, instead of outputting `NaN`
