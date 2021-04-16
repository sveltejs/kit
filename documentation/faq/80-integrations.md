---
question: How do I use X with SvelteKit?
---

### How do I setup library X?

Please see [sveltejs/integrations](https://github.com/sveltejs/integrations#sveltekit) for examples of using many popular libraries like Tailwind, PostCSS, Firebase, GraphQL, mdsvex, and more.

### How do I use Babel, CoffeeScript, Less, PostCSS / SugarSS, Pug, scss/sass, Stylus, TypeScript, `global` styles, or replace?

SvelteKit provides [https://github.com/sveltejs/svelte-preprocess](svelte-preprocess) by default. For many of these tools you only need to install the corresponding library such as `npm install -D sass`or `npm install -D less`. See the [https://github.com/sveltejs/svelte-preprocess](svelte-preprocess) docs for full details.

Also see [the examples above](faq#how-do-i-use-x-with-sveltekit-how-do-i-setup-library-x) of setting up these and similar libraries.

### How do I setup a database?

Put the code to query your database in [endpoints](../docs#routing-endpoints) - don't query the database in .svelte files. You can create a `db.js` or similar that sets up a connection immediately and makes the client accessible throughout the app as a singleton. You can execute any one-time setup code in `hooks.js` and import your database helpers into any endpoint that needs them.

### How do I use Axios?

You probably don't need it. We'd generally recommend you just use `fetch` instead. If you insist, you're probably better off using the ESM drop-in replacement `redaxios` [until axios utilizes ESM](https://github.com/axios/axios/issues/1879). Finally, if you still want to use Axios itself, try putting it in `optimizeDeps.include`.
