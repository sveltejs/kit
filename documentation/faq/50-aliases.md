---
title: How do I setup a path alias?
---

Aliases can be set in `svelte.config.js` as described in the [`configuration`](/docs/configuration#alias) docs.

Then run `npm run prepare` or `npm run dev` (both will execute a sync command). SvelteKit will automatically generate the required alias configuration in `jsconfig.json` or `tsconfig.json`.
