---
'@sveltejs/kit': patch
---

fix: decode all numeric character references, including above `ffff`, when crawling prerendered pages
