---
'@sveltejs/kit': patch
---

fix: keep `for await` consumers attached across live query reconnects, settle `reconnect()` on every exit path, and preserve the last value when a live stream completes without yielding
