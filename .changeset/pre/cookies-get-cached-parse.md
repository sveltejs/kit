---
'@sveltejs/kit': patch
---

perf: cache the default cookie header parse and avoid allocations in `cookies.get`
