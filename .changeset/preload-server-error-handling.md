---
'@sveltejs/kit': patch
---

fix: do not invoke client `handleError` for errors already handled on the server when the navigation is a preload
