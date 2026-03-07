---
'@sveltejs/kit': patch
---

fix: blur active element before component update during navigation so that blur/focusout handlers fire while old component data is still valid
