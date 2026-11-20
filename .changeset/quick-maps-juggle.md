---
'@sveltejs/kit': patch
---

fix: reject promises streamed from a server `load` function when the `__data.json` response ends early, fails, or contains a value that cannot be decoded
