---
'@sveltejs/kit': patch
'@sveltejs/adapter-node': patch
---

fix: externalize `@opentelemetry/api` to prevent bundler chunk colocation between `instrumentation.server.js` and application code
