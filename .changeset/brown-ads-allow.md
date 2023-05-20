---
'@sveltejs/kit': patch
---

fix: precedence of `entries` should be `+page => +page.server => +server`
fix: prerendering a route with a `+page` and `+server` file correctly renders the page
