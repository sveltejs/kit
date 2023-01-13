---
title: Building Your App
---

Building a SvelteKit consists of two stages. First the production build is run. This will create a client and a server build which are later consumed by the corresponding environments. [Prerendering](/docs/page-options#prerender) is executed at this stage, if enabled. The second stage is to _adapt_ the output to your deployment target using adapters (more on that in the [adapters docs](/docs/adapters)).

## During the build

SvelteKit will load your `+page/layout(.server).js` files (and all files they import) for analysis during the build. This could lead to code eagerly running which you want to avoid at that stage. Wrap the code in question with `building` from `$app/environment`:

```js
/// file: +layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function setupMyDatabase(): void;
}

// @filename: index.js
// ---cut---
import { building } from '$app/environment';
import { setupMyDatabase } from '$lib/server/database';

if (!building) {
	setupMyDatabase();
}

export function load() {
	// ...
}
```

## Preview your app

Run the `preview` script to look at your app locally after the production build is done. Note that this does not yet include adapter-specific adjustments like the [`platform` object](/docs/adapters#supported-environments-platform-specific-context).

## Adapters

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output for deployment. Read more about them in [adapters](/docs/adapters).
