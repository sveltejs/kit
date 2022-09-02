---
'@sveltejs/kit': patch
---

Silently skip prefetching of external URLs when using `data-sveltekit-prefetch`. Warn like before when calling `prefetch()` for external URLs.
