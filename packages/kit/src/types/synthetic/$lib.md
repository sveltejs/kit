This is a simple alias to `src/lib`, configured via the [`imports`](https://nodejs.org/api/packages.html#subpath-imports) field in your `package.json`. It allows you to access common components and utility modules without `../../../../` nonsense.

> [!NOTE] Previously this alias was `$lib` and was configured via `kit.files.lib`. It is now `#lib` and must be declared in your `package.json` `imports` field.

### `#lib/server`

A subdirectory of `#lib`. SvelteKit 2 prevented you from importing any modules in `#lib/server` into client-side code. In SvelteKit 3 _all_ files within your project in a `server` folder (except the routes and assets folder) are treated as [server-only modules](https://svelte.dev/docs/kit/server-only-modules).
