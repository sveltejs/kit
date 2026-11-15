---
'@sveltejs/adapter-node': patch
---

fix: set `X-Accel-Buffering: no` on `text/event-stream` responses whose content type has parameters, such as `charset=utf-8`
