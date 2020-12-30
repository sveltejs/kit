---
title: Migrating
---


Until we reach version 1.0, there may be occasional changes to the project structure Sapper expects.

### 0.28 to 0.29

* Rollup 2.29+ is now required. ([#1666](https://github.com/sveltejs/sapper/pull/1666))

### 0.27 to 0.28

* Rollup 0.x.x is no longer supported. ([#1326](https://github.com/sveltejs/sapper/pull/1326)). Any version greater than 1.x is supported, but the latest (currently 2.x) is strongly recommended.
* Versions of Svelte before 3.17.3 are no longer supported. ([#1067](https://github.com/sveltejs/sapper/pull/1067))
* `<script>` tags will now be loaded with the `defer` attribute ([#1123](https://github.com/sveltejs/sapper/pull/1123)), which means:
	* IE9 support was dropped since IE9 may interleave deferred script execution.
	* `%sapper.scripts%` can be moved to the `<head>` section for slightly better performance
* You must set `hydratable: true` in your server build as well in order to properly hydrate `<head>` elements ([#1067](https://github.com/sveltejs/sapper/pull/1067))
* The files in the generated `service-worker.js` file are now prefixed with a `/` ([#1244](https://github.com/sveltejs/sapper/pull/1244)). If you are using the `service-worker.js` from the default template, no changes will be necessary. If you have modified your service worker, please check to ensure compatibility.
* The `sapper-noscroll` attribute was renamed to `sapper:noscroll` ([#1320](https://github.com/sveltejs/sapper/pull/1320))
* Rollup users should update the `onwarn` filter in `rollup.config.js` to match [the change made in `sapper-template`](https://github.com/sveltejs/sapper-template/pull/246/files). 

### 0.25 to 0.26

The most significant change yet: Sapper is now built on Svelte 3.

#### Importing Sapper

Your app's runtime is now built to `src/node_modules/@sapper` — this allows you to easily import it from anywhere in your source code. Update your `server.js`...

```diff
// src/server.js
-import * as sapper from '../__sapper__/server.js';
+import * as sapper from '@sapper/server';
```

...and client.js:

```diff
-import * as sapper from '../__sapper__/client.js';
+import * as sapper from '@sapper/app';

sapper.start({
	target: document.querySelector('#sapper')
});
```

The same applies to imports like `goto` and `prefetchRoutes`.


#### Webpack config

If you're using webpack, you must update your configuration to recognise `.mjs` and `.svelte` files:

```js
resolve: {
	extensions: ['.mjs', '.js', '.json', '.svelte', '.html']
}
```

If you're using .svelte files (recommended), you'll also need to tell `svelte-loader` to expect them:

```diff
-test: /\.html$/
+test: /\.(svelte|html)$/
```


#### Session data

Passing data from server to client is now accomplished with a `session` function passed to the middleware:

```js
// src/server.js
sapper.middleware({
	session: (req, res) => ({
		// session data goes here
	})
})
```

This data is available in `preload` functions as the second argument:

```html
<!-- SomeComponent.svelte -->
<script context="module">
	export function preload(page, session) {
		const { path, params, query } = page; // as before

		if (!session.user) return this.redirect(302, 'login');
		// ...
	}
</script>
```


#### Stores

It is also available, along with `page` and `preloading`, as a store inside components:

```html
<script>
	import * as sapper from '@sapper/app';
	const { page, preloading, session } = sapper.stores();
</script>
```

`page` and `preloading` are [readable stores](https://svelte.dev/tutorial/readable-stores), while `session` is [writable](https://svelte.dev/tutorial/writable-stores). Writing to the session store (for example, after the user logs in) will cause any `preload` functions that rely on session data to re-run; it will not persist anything to the server.


#### Layouts

Your layout components should now use a `<slot>` element to render nested routes, instead of `<svelte:component>`:

```diff
<main>
-	<svelte:component this={child.component} {...child.props}/>
+	<slot></slot>
</main>
```

The layout component itself receives a `segment` prop, which is equivalent to `child.segment` in earlier versions.


### 0.21 to 0.22

Instead of importing middleware from the `sapper` package, or importing the client runtime from `sapper/runtime.js`, the app is *compiled into* the generated files:

```diff
// src/client.js
-import { init } from 'sapper/runtime.js';
-import { manifest } from './manifest/client.js';
+import * as sapper from '../__sapper__/client.js';

-init({
+sapper.start({
	target: document.querySelector('#sapper'),
-	manifest
});
```

```diff
// src/server.js
import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
-import sapper from 'sapper';
-import { manifest } from './manifest/server.js';
+import * as sapper from '../__sapper__/server.js';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
-		sirv('assets', { dev }),
+		sirv('static', { dev }),
-		sapper({ manifest })
+		sapper.middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
```

```diff
// src/service-worker.js
-import { assets, shell, routes, timestamp } from './manifest/service-worker.js';
+import { files, shell, routes, timestamp } from '../__sapper__/service-worker.js';
```

In addition, the default build and export directories are now `__sapper__/build` and `__sapper__/export` respectively.


### 0.20 to 0.21

* The `app` directory is now `src`
* The `routes` directory is now `src/routes`
* The `assets` directory is now `static` (remember to update your `src/server.js` file to reflect this change as well)
* Instead of having three separate config files (`webpack/client.config.js`, `webpack/server.config.js` and `webpack/service-worker.config.js`), there is a single `webpack.config.js` file that exports `client`, `server` and `serviceworker` configs.


### 0.17 to 0.18

The `sapper/webpack/config.js` file (required in the `webpack/*.config.js` files) is now `sapper/config/webpack.js`.


### 0.14 to 0.15

This release changed how routing is handled, resulting in a number of changes.

Instead of a single `App.html` component, you can place `_layout.html` components in any directory under `routes`. You should move `app/App.html` to `routes/_layout.html` and modify it like so:

```diff
-<!-- app/App.html -->
+<!-- routes/_layout.html -->

-<Nav path={props.path}/>
+<Nav segment={child.segment}/>

-<svelte:component this={Page} {...props}/>
+<svelte:component this={child.component} {...child.props}/>
```

You will then need to remove `App` from your client and server entry points, and replace `routes` with `manifest`:

```diff
// app/client.js
import { init } from 'sapper/runtime.js';
-import { routes } from './manifest/client.js';
-import App from './App.html';
+import { manifest } from './manifest/client.js';

init({
	target: document.querySelector('#sapper'),
-	routes,
-	App
+	manifest
});
```

```diff
// app/server.js
import sirv from 'sirv';
import polka from 'polka';
import sapper from 'sapper';
import compression from 'compression';
-import { routes } from './manifest/server.js';
-import App from './App.html';
+import { manifest } from './manifest/server.js';

polka()
	.use(
		compression({ threshold: 0 }),
		sirv('assets'),
-		sapper({ routes, App })
+		sapper({ manifest })
	)
	.listen(process.env.PORT)
	.catch(err => {
		console.log('error', err);
	});
```

`preload` functions no longer take the entire request object on the server; instead, they receive the same argument as on the client.



### 0.13 to 0.14

The `4xx.html` and `5xx.html` error pages have been replaced with a single page, `_error.html`. In addition to the regular `params`, `query` and `path` props, it receives `status` and `error`.




### 0.11 to 0.12

In earlier versions, each page was a completely standalone component. Upon navigation, the entire page would be torn down and a new one created. Typically, each page would import a shared `<Layout>` component to achieve visual consistency.

As of 0.12, this changes: we have a single `<App>` component, defined in `app/App.html`, which controls the rendering of the rest of the app. See [sapper-template](https://github.com/sveltejs/sapper-template/blob/365e8521ae6e1ffc5f1359342bb59c92a0014dca/app/App.html) for an example.

This component is rendered with the following values:

* `Page` — a component constructor for the current page
* `props` — an object with `params`, `query`, and any data returned from the page's `preload` function
* `preloading` — `true` during preload, `false` otherwise. Useful for showing progress indicators

Sapper needs to know about your app component. To that end, you will need to modify your `app/server.js` and `app/client.js`:

```diff
// app/server.js
import polka from 'polka';
import sapper from 'sapper';
import serve from 'serve-static';
import { routes } from './manifest/server.js';
+import App from './App.html';

polka()
	.use(
		serve('assets'),
-		sapper({ routes })
+		sapper({ App, routes })
	)
	.listen(process.env.PORT);
```

```diff
// app/client.js
import { init } from 'sapper/runtime.js';
import { routes } from './manifest/client.js';
+import App from './App.html';

-init(target: document.querySelector('#sapper'), routes);
+init({
+	target: document.querySelector('#sapper'),
+	routes,
+	App
+});
```

Once your `App.html` has been created and your server and client apps updated, you can remove any `<Layout>` components from your individual pages.


### <0.9 to 0.10

##### app/template.html

* Your `<head>` element must contain `%sapper.base%` (see ([base URLs](docs#Base_URLs))
* Remove references to your service worker; this is now handled by `%sapper.scripts%`

##### Pages

* Your `preload` functions should now use `this.fetch` instead of `fetch`. `this.fetch` allows you to make credentialled requests on the server, and means that you no longer need to create a `global.fetch` object in `app/server.js`.



### 0.6 to 0.7

Consult [sapper-template](https://github.com/sveltejs/sapper-template) for full examples of all the below points.


##### package.json

To start a dev server, use `sapper dev` rather than `node server.js`. In all likelihood, your package.json will have an `npm run dev` script that will need to be updated.

##### Entry points

As of version 0.7, Sapper expects to find your entry points — for client, server and service worker — in an `app` folder. Instead of using magically-injected `__variables__`, each entry point imports from its corresponding file in the `app/manifests` folder. These are automatically generated by Sapper.

```js
// app/client.js (formerly templates/main.js)
import { init } from 'sapper/runtime.js';
import { routes } from './manifest/client.js';

init(document.querySelector('#sapper'), routes);

if (module.hot) module.hot.accept(); // enable hot reloading
```

```js
// app/server.js (formerly server.js)
// Note that we're now using ES module syntax, because this
// file is processed by webpack like the rest of your app
import sapper from 'sapper';
import { routes } from './manifest/server.js';
// ..other imports

// we now pass the `routes` object to the Sapper middleware
app.use(sapper({
	routes
}));
```

```js
// app/service-worker.js (formerly templates/service-worker.js)
import { assets, shell, timestamp, routes } from './manifest/service-worker.js';

// replace e.g. `__assets__` with `assets` in the rest of the file
```


##### Templates and error pages

In previous versions, we had `templates/2xx.html`, `templates/4xx.html` and `templates/5xx.html`. Now, we have a single template, `app/template.html`, which should look like your old `templates/2xx.html`.

For handling error states, we have a 'special' route: `routes/_error.html`.

This page is just like any other, except that it will get rendered whenever an error states is reached. The component has access to `status` and `error` values.

Note that you can now use `this.error(statusCode, error)` inside your `preload` functions.


##### Webpack configs

Your webpack configs now live in a `webpack` directory:

* `webpack.client.config.js` is now `webpack/client.config.js`
* `webpack.server.config.js` is now `webpack/server.config.js`

If you have a service worker, you should also have a `webpack/service-worker.config.js` file. See [sapper-template](https://github.com/sveltejs/sapper-template) for an example.
