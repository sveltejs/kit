---
'@sveltejs/kit': patch
---

fix: also await for `settled` in case there's no fork but there's async work
