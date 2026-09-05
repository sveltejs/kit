---
'@sveltejs/kit': patch
---

fix: don't throw from remote form `validate()` if the form unmounts while it is waiting for a tick
