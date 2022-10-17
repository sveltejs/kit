---
'create-svelte': patch
---

After running `svelte-package` (via `create-svelte`), the user is supposed to
run: `npm publish package/`. However, it is easy to accidentally run 
`npm publish` on the wrong directory out of habit. With this change, 
when the user accidentally tries to publish the `./` directory, they will be 
directed to publish the `./package/` directory instead.
