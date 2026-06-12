---
'@sveltejs/kit': major
---

breaking: `page.url` from `$app/state` is now a `SvelteURL`, so reading individual properties like `url.pathname` or `url.search` in an effect or derived only reacts when those properties actually change. Effects that depended on the identity of the `page.url` object itself no longer re-run on navigation, read a property instead
