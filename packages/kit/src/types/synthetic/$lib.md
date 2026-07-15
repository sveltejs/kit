This is a simple alias to `src/lib`, or whatever directory is specified as [`config.files.lib`](https://svelte.dev/docs/kit/configuration#files). It allows you to access common components and utility modules without `../../../../` nonsense. The alias is configured via the [`imports`](https://nodejs.org/api/packages.html#subpath-imports) field in your `package.json`.

> [!NOTE] Previously this alias was `$lib` and was automatically configured by SvelteKit. It is now `#lib` and must be declared in your `package.json` `imports` field.

### `#lib/server`

A subdirectory of `#lib`. SvelteKit will prevent you from importing any modules in `#lib/server` into client-side code. See [server-only modules](https://svelte.dev/docs/kit/server-only-modules).
