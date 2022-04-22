---
'@sveltejs/kit': patch
---

Changed caching behavior of LoadOutput. Instead of returning a maxage property, return a cache object with a maxage property, and, optionally, a private property.
