---
'@sveltejs/adapter-node': patch
---

fix: reject an invalid `XFF_DEPTH` at startup instead of failing every `getClientAddress()` call
