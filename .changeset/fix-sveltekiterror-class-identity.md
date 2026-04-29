---
"@sveltejs/kit": patch
---

fix: use name-based fallback in `get_status`/`get_message` when `SvelteKitError` or `HttpError` crosses a bundle boundary
