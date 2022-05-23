---
title: How do I setup a path alias?
---

Set alias in `svelte.config.js` as described in [`configuration section`](https://kit.svelte.dev/docs/configuration#alias) in docs.

Then run `npm run sync` or `npm run dev` (will execute sync as well). SvelteKit will automatically generate alias configuration in `jsconfig.json` or `tsconfig.json`.
