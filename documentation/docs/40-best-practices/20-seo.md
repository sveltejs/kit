---
title: Référencement
---

L'aspect le plus important du référencement (_SEO_ en anglais) est de créer du contenu de bonne qualité que beaucoup d'autres sites web référencent via des liens. Cependant, certaines considérations techniques sont à connaître pour construire des sites bien référencés.

## Clé-en-main

### SSR

Même si ces dernières années les moteurs de recherche se sont améliorés dans l'indexation du contenu rendu par du code JavaScript côté client, le contenu rendu côté serveur ([SSR](glossary#ssr)) est indexé plus fréquemment et plus efficacement. SvelteKit utilise le SSR par défaut, et bien que vous ayez la possibilité de le désactiver dans le [hook `handle`](hooks#hooks-de-serveur-handle), vous devriez le laisser activé, à moins d'avoir une bonne raison de le désactiver.

> Le rendu qu'effectue SvelteKit est très configurable, et vous pouvez implémenter du [rendu dynamique](https://developers.google.com/search/docs/advanced/javascript/dynamic-rendering) si nécessaire. Ce n'est en général pas recommandé, puisque le SSR a d'autres avantages au-delà du référencement.

### Performance

Les indicateurs tels que les [Core Web Vitals](https://web.dev/vitals/#core-web-vitals) impactent la qualité du référencement. Svelte et SvelteKit n'introduisent qu'une surcouche minimale, et permettent donc de facilement construire des sites très performants. Vous pouvez tester la performance de votre site en utilisant les outils [PageSpeed Insights](https://pagespeed.web.dev/) ou [Lighthouse](https://developers.google.com/web/tools/lighthouse) que propose Google. N'hésitez pas à lire la [page dédiée aux performances](performance) pour plus de détails.

### URLs normalisées

SvelteKit redirige les chemins avec des <span class='vo'>[trailing slashs](PUBLIC_SVELTE_SITE_URL/docs/web#trailing-slash)</span> vers des chemins sans (ou inversement, selon votre [configuration](page-options#trailingslash)), car les URLs dupliquées détériorent votre référencement.

## Gestion manuelle

### &lt;title&gt; et &lt;meta&gt;

Chaque page devrait avoir des balises `<title>` et `<meta name="description">` uniques et bien écrites dans un [`<svelte:head>`](PUBLIC_SVELTE_SITE_URL/docs#template-syntax-svelte-head). Des guides pour bien écrire ses titres et descriptions, ainsi que d'autres suggestions pour rendre le contenu compréhensible par les moteurs de recherche, sont disponibles dans la documentation de [audits Lighthouse SEO](https://web.dev/lighthouse-seo/) (en anglais).

> Une pratique classique est de renvoyer les données liées au référencement dans les fonctions [`load`](load) de page, puis de les utiliser (en tant que [`$page.data`](modules#$app-stores)) dans le `<svelte:head>` de votre [layout](routing#layout) racine.

### Sitemaps

Les [sitemaps](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap) aident les moteurs de recherche à prioriser les pages au sein de votre site, particulièrement lorsque vous avez une grande quantité de contenu. Vous pouvez créer un <span class='vo'>[sitemap](PUBLIC_SVELTE_SITE_URL/docs/web#sitemap)</span> dynamiquement en utilisant un <span class='vo'>[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> :

```js
/// file: src/routes/sitemap.xml/+server.js
export async function GET() {
	return new Response(
		`
		<?xml version="1.0" encoding="UTF-8" ?>
		<urlset
			xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
			xmlns:xhtml="https://www.w3.org/1999/xhtml"
			xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
			xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
			xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
			xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
		>
			<!-- les éléments <url> sont définis ici -->
		</urlset>`.trim(),
		{
			headers: {
				'Content-Type': 'application/xml'
			}
		}
	);
}
```

### AMP

Une réalité malheureuse du développement web moderne est qu'il est parfois nécessaire de créer une version [AMP](https://amp.dev/) de votre site. Avec SvelteKit, ceci peut être fait en définissant l'option [`inlineStyleThreshold`](configuration#inlinestylethreshold)...

```js
/// file: svelte.config.js
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// puisque les <link rel="stylesheet">
		// ne sont pas permis, inliner tous les styles
		inlineStyleThreshold: Infinity
	}
};

export default config;
```

...puis en désactivant le rendu côté client (`csr`) dans votre fichier `+layout.js`/`+layout.server.js` racine...

```js
/// file: src/routes/+layout.server.js
export const csr = false;
```

...puis en ajoutant `amp` dans votre fichier `app.html`...

```html
<html amp>
...
```

...et en transformant le HTML à l'aide de `tranformPageChunk` et de la fonction `transform` importée de `@sveltejs/amp` :

```js
/// file: src/hooks.server.js
import * as amp from '@sveltejs/amp';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let buffer = '';
	return await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html;
			if (done) return amp.transform(buffer);
		}
	});
}
```

Afin d'éviter d'envoyer du CSS inutilisé après avoir transformé une page en sa version AMP, nous pouvons utiliser le paquet [`dropcss`](https://www.npmjs.com/package/dropcss) :

```js
/// file: src/hooks.server.js
// @errors: 2307
import * as amp from '@sveltejs/amp';
import dropcss from 'dropcss';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let buffer = '';

	return await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html;

			if (done) {
				let css = '';
				const markup = amp
					.transform(buffer)
					.replace('⚡', 'amp') // dropcss ne sait pas gérer ce caractère
					.replace(/<style amp-custom([^>]*?)>([^]+?)<\/style>/, (match, attributes, contents) => {
						css = contents;
						return `<style amp-custom${attributes}></style>`;
					});

				css = dropcss({ css, html: markup }).css;
				return markup.replace('</style>', `${css}</style>`);
			}
		}
	});
}

```

> C'est une bonne idée d'utiliser le <span class='vo'>[hook](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> `handle` pour valider le HTML transformé grâce à `amphtml-validator`, mais seulement si vous prérendez les pages, car ce processus est très lent.

