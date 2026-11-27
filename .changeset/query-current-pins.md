---
'@sveltejs/kit': patch
---

fix: keep a query or live query cached while an effect reads its `current`, `error`, `loading` or `ready`
