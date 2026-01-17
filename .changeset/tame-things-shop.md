---
'@sveltejs/kit': minor
---

feat: allow providing cache to `reroute`

This provides cache as an argument to reroute and doesn't affect the default caching behavior, but enables the choice of which routes should be cached and which ones should always run the hook.

This is important because you might (among other things) depend on the reroute hook to access different layouts, contexts or other features depending on client state — especially now that the fetch also allows forwarding of cookies to the backend.
