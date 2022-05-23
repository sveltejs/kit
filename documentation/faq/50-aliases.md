---
title: How do I setup a path alias?
---

Aliases can be set in `svelte.config.js` as described in the [`configuration`](/docs/configuration#alias) docs.

Then run `npm run sync` or `npm run dev` (will execute sync as well). SvelteKit will automatically generate alias configuration in `jsconfig.json` or `tsconfig.json`.
