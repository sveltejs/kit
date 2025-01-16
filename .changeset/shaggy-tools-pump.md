---
'@sveltejs/kit': minor
---

feat: remove the `postinstall` script to support pnpm 10

NOTE: users should add `"prepare": "svelte-kit sync`" to their `package.json` in order to avoid the following warning upon first running Vite:
```
▲ [WARNING] Cannot find base config file "./.svelte-kit/tsconfig.json" [tsconfig.json]

    tsconfig.json:2:12:
      2 │   "extends": "./.svelte-kit/tsconfig.json",
        ╵              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```
