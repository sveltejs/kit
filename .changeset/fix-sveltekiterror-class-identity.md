---
"@sveltejs/kit": patch
---

fix: add name-based fallback in `get_status`/`get_message` for cross-bundle `SvelteKitError` identity mismatches, preventing body-size-limit 413 errors from surfacing as 500s in adapter-node deployments
