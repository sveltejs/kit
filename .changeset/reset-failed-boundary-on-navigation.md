---
'@sveltejs/kit': patch
---

fix: reset failed `<svelte:boundary>` on client navigation so a stale `+error.svelte` is torn down
