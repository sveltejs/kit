---
'@sveltejs/adapter-node': patch
---

fix: add `X-Accel-Buffering: no` header to `text/event-stream` responses to prevent reverse proxies such as nginx from buffering streamed responses
