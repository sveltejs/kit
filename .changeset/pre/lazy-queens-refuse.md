---
'@sveltejs/kit': patch
---

fix: only require the `svelte-trusted-html` trusted-types policy when client-side code is shipped, allowing builds where all pages have `csr: false`
