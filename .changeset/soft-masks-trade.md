---
'create-svelte': patch
'@sveltejs/kit': patch
---

Use @sveltejs/kit postinstall lifecycle hook to invoke 'svelte-kit sync' instead of prepare in projects created by create-svelte
