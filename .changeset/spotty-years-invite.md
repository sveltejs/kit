---
'@sveltejs/kit': patch
---

fix: handle `about:` and `data:` protocols in embedded contexts

Disables relative path computation when `embedded: true` to prevent `new URL('.', location)` from throwing on non-hierarchical protocols (`about:`, `data:`). Also treats `about:`/`data:` URLs as internal in `is_external_url` so navigation works within embedded webviews and iframes.
