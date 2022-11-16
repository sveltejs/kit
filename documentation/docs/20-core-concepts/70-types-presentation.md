---
title: Types presentation
---

Brainstorming ideas for better presentation of types.

Compare the (WIP) examples below with https://kit.svelte.dev/docs/types#sveltejs-kit-cookies, https://kit.svelte.dev/docs/types#sveltejs-kit-config, https://kit.svelte.dev/docs/types#sveltejs-kit-kitconfig and https://kit.svelte.dev/docs/configuration.

The idea is that we'd generate this automatically from `types/index.d.ts` etc (including `@example` and `@default` tags), and configuration would be documented this way rather than via the hand-written https://kit.svelte.dev/docs/configuration.

### @sveltejs/kit

#### Cookies

An interface for interacting with cookies during a request.

```ts
get(name, opts): string | undefined
```

* `name: string` The name of the cookie
* `opts?: import('cookie').CookieParseOptions` An object containing an optional `decode` function

Gets a cookie that was previously set with `cookies.set`, or from the request headers.

```ts
set(name, value, opts): void;
```

* `name: string` The name of the cookie
* `value: string` The cookie value
* `opts?: import('cookie').CookieSerializeOptions` TODO Cookie options

Sets a cookie. This will add a `set-cookie` header to the response, but also make the cookie available via `cookies.get` during the current request.

The `httpOnly` and `secure` options are `true` by default, and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.

By default, the `path` of a cookie is the 'directory' of the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.


```ts
delete(name, opts): void;
```

* `name: string` The name of the cookie
* `value: string` The cookie value
* `opts?: import('cookie').CookieSerializeOptions` TODO Cookie options

Deletes a cookie by setting its value to an empty string and setting the expiry date in the past.


```ts
serialize(name, value, opts): string;
```

* `name: string` the name for the cookie
* `value: string` value to set the cookie to
* `opts?: import('cookie').CookieSerializeOptions` TODO Cookie options

Serialize a cookie name-value pair into a Set-Cookie header string.

The `httpOnly` and `secure` options are `true` by default, and must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP. The `sameSite` option defaults to `lax`.

By default, the `path` of a cookie is the current pathname. In most cases you should explicitly set `path: '/'` to make the cookie available throughout your app.

#### Config

Your project's configuration, exported from svelte.config.js.

```ts
compilerOptions?: CompileOptions
```

Svelte compiler options.

```ts
extensions?: string[]
```

An array of file extensions that should be treated as Svelte components.

Default value: `['.svelte']`

```ts
kit?: KitConfig
```

SvelteKit-specific configuration.

```ts
package?: {...}
```

* `source?: string` `"src/lib"` Path to the source folder.
* `dir?: string` `"package"` Path to write the package to
* `emitTypes?: boolean` `true` Whether to generate `.d.ts` files
* `exports?: (filepath: string) => boolean` `() => true` Whether to include a file in `pkg.exports`
* `files?: (filepath: string) => boolean` `() => true` Whether to include a file in the package

Configuration for `svelte-package`

```ts
preprocess?: any
```

Preprocessing options.

```ts
[key: string]: any;
```

Any additional options required by other tooling.

#### KitConfig

Your SvelteKit-specific configuration.

```ts
adapter?: Adapter
```

Run when executing `vite build` and determines how the output is converted for different platforms. See [Adapters](/docs/adapters).

Default value: `undefined`

```ts
alias?: Record<string, string>
```

An object containing zero or more aliases used to replace values in `import` statements. These aliases are automatically passed to Vite and TypeScript.

```js
/// file: svelte.config.js
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		alias: {
			// this will match a file
			'my-file': 'path/to/my-file.js',

			// this will match a directory and its contents
			// (`my-directory/x` resolves to `path/to/my-directory/x`)
			'my-directory': 'path/to/my-directory',

			// an alias ending /* will only match
			// the contents of a directory, not the directory itself
			'my-directory/*': 'path/to/my-directory/*'
		}
	}
};
```

> The built-in `$lib` alias is controlled by `config.kit.files.lib` as it is used for packaging.

> You will need to run `npm run dev` to have SvelteKit automatically generate the required alias configuration in `jsconfig.json` or `tsconfig.json`.

Default value: `{}`

```ts
appDir?: string
```

Default value: `'_app'`

```ts
csp?: {...}
```

* `mode?: 'hash' | 'nonce' | 'auto'` `'auto'` -
* `directives?: CspDirectives` `TODO`
* `reportOnly?: CspDirectives` `TODO`
