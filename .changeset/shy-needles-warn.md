---
'@sveltejs/kit': patch
---

fix: support HTTP/2 in dev and production. Revert the changes from [#12907](https://github.com/sveltejs/kit/pull/12907) to downgrade HTTP/2 to TLS as now being unnecessary
