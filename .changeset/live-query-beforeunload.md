---
'@sveltejs/kit': patch
---

fix: keep `query.live` connections open when `beforeunload` fires without the page unloading, such as for `mailto:` links and downloads
