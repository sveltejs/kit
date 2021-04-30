---
'@sveltejs/kit': patch
---

Not calling JSON.stringify on endpoint's body if it's a string and the content-type header denotes json
