---
"@sveltejs/kit": patch
---

fix: preserve the status code of `HttpError` and `SvelteKitError` thrown across a bundle boundary (e.g. when an adapter inlines its own `@sveltejs/kit` copy), instead of reporting them as a generic 500
