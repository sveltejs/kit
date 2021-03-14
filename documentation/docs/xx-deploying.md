---
title: Deployment
---

SvelteKit apps run anywhere that supports Node 12 or higher.

### Deploying from svelte-kit build

You will need the `.svelte/build` and `static` directories as well as the production dependencies in `node_modules` to run the application. Node production dependencies can be generated with `npm ci --prod`, you can then start your app with:

```bash
node .svelte/build
```

Alternatively, you can use the SvelteKit CLI to start your app.

```bash
svelte-kit start
```

### Deploying service workers

[SvelteKit does not yet support service workers.](https://github.com/sveltejs/kit/issues/10)

In Sapper, you could deploy service workers with the directions below.

Sapper makes the Service Worker file (`service-worker.js`) unique by including a timestamp in the source code
(calculated using `Date.now()`).

In environments where the app is deployed to multiple servers (such as [Vercel]), it is advisable to use a
consistent timestamp for all deployments. Otherwise, users may run into issues where the Service Worker
updates unexpectedly because the app hits server 1, then server 2, and they have slightly different timestamps.

To override Sapper's timestamp, you can use an environment variable (e.g. `SAPPER_TIMESTAMP`) and then modify
the `service-worker.js`:

```js
const timestamp = process.env.SAPPER_TIMESTAMP; // instead of `import { timestamp }`

const ASSETS = `cache${timestamp}`;

export default {
	/* ... */
	plugins: [
		/* ... */
		replace({
			/* ... */
			'process.env.SAPPER_TIMESTAMP': process.env.SAPPER_TIMESTAMP || Date.now()
		})
	]
};
```

Then you can set it using the environment variable, e.g.:

```bash
SAPPER_TIMESTAMP=$(date +%s%3N) npm run build
```

When deploying to [Vercel], you can pass the environment variable into the Vercel CLI tool itself:

```bash
vercel -e SAPPER_TIMESTAMP=$(date +%s%3N)
```

[vercel]: https://vercel.com/home
