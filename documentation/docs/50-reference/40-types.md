---
title: Types
---

## Public types

Les types suivants peuvent être importés depuis `@sveltejs/kit` :

> TYPES: @sveltejs/kit

## Private types

Les types suivants sont référencés par les types publics documentés ci-dessus, mais ne peuvent pas être directement importés :

> TYPES: Private types

## Generated types

Les types `RequestHandler` et `Load` acceptent tous les deux un argument `Params` vous permettant de typer l'objet `params`. Par exemple, ce <span class='vo'>[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> attend les paramètres `foo`, `bar`, et `baz` :

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.server.js
// @errors: 2355 2322 1360
/** @type {import('@sveltejs/kit').RequestHandler<{
    foo: string;
    bar: string;
    baz: string
  }>} */
export async function GET({ params }) {
	// ...
}
```

Il est évident que ceci est lourd à écrire, et peu versatile (si vous êtes amené•e à renommer le dossier `[foo]` en `[qux]`, le type ne reflèterait plus la réalité).

Pour résoudre ce problème, SvelteKit génère des fichiers `.d.ts` pour chacun de vos <span class='vo'>[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> et chacune de vos pages :

```ts
/// file: .svelte-kit/types/src/routes/[foo]/[bar]/[baz]/$types.d.ts
/// link: false
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type PageServerLoad = Kit.ServerLoad<RouteParams>;
export type PageLoad = Kit.Load<RouteParams>;
```

Ces types peuvent être importés dans vos <span class='vo'>[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> et pages comme s'ils appartenaient au même dossier, grâce à l'option [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) de votre configuration TypeScript :

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.server.js
// @filename: $types.d.ts
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type PageServerLoad = Kit.ServerLoad<RouteParams>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export async function GET({ params }) {
	// ...
}
```

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.js
// @filename: $types.d.ts
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type PageLoad = Kit.Load<RouteParams>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	// ...
}
```

> Pour que ceci fonctionne, votre propre fichier `tsconfig.json` ou `jsconfig.json` doit étendre le fichier `.svelte-kit/tsconfig.json` que SvelteKit génère (où `.svelte-kit` est votre [`outDir`](configuration#outdir)) :
>
> `{ "extends": "./.svelte-kit/tsconfig.json" }`

### `tsconfig.json` par défaut

Le fichier généré `.svelte-kit/tsconfig.json` contient un mélange d'options. Certaines sont générées programmatiquement en fonction de votre configuration de projet, et ne devraient pas être redéfinies sans une bonne raison :

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		"baseUrl": "..",
		"paths": {
			"$lib": "src/lib",
			"$lib/*": "src/lib/*"
		},
		"rootDirs": ["..", "./types"]
	},
	"include": ["../src/**/*.js", "../src/**/*.ts", "../src/**/*.svelte"],
	"exclude": ["../node_modules/**", "./**"]
}
```

D'autres sont requises pour que SvelteKit fonctionne correctement, et devraient également être laissées telles quelles sauf si vous savez ce que vous faites :

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		// ceci assure que les types sont explicitement
		// importés avec `import type`, ce qui est
		// nécessaire car sinon `svelte-preprocess`
		// ne peut pas compiler les composants correctement
		"importsNotUsedAsValues": "error",

		// Vite compile un module TypeScript à la fois,
		// plutôt que de compiler le graph entier de modules
		"isolatedModules": true,

		// TypeSCript ne peut pas "voir" lorsque
		// vous utilisez une valeur importée dans votre markup,
		// nous avons donc besoin de ceci
		"preserveValueImports": true,

		// Ceci assure que `vite build` et `svelte-package`
		// fonctionnent correctement
		"lib": ["esnext", "DOM", "DOM.Iterable"],
		"moduleResolution": "node",
		"module": "esnext",
		"target": "esnext"
	}
}
```

## App

> TYPES: App
