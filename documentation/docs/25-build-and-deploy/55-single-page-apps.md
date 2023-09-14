---
title: Applications de type SPA
---

Vous pouvez transformer n'importe quelle application SvelteKit, en utilisant n'importe quel adaptateur, en une <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span> intégralement rendue sur le client en désactivant le <span class="vo">[SSR](PUBLIC_SVELTE_SITE_URL/docs/web#server-side-rendering)</span> au niveau du <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine :

```js
/// file: src/routes/+layout.js
export const ssr = false;
```

> Dans la plupart des situations ceci n'est pas recommandé : cela détériore le référencement, a tendance à ralentir la performance ressentie, et rend votre application inutilisable si JavaScript est indisponible ou non activé (ce qui arrive [plus souvent qu'on ne le croie](https://kryogenix.org/code/browser/everyonehasjs.html) (en anglais)).

Si vous n'avez pas de logique sur le serveur (c'est-à-dire pas de fichiers `+page.server.js`, `+layout.server.js` ou `+server.js`), vous pouvez utiliser [`adapter-static`](adapter-static) pour créer votre <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span> en ajoutant une _page par défaut_.

## Usage

Installez l'adaptateur statique avec `npm i -D @sveltejs/adapter-static`, puis ajoutez-le à votre fichier `svelte.config.js` avec les options suivantes :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter({
			fallback: '200.html' // peut être différent selon les hébergeurs
		})
	}
};
```

La page `fallback` est une page HTML créée par SvelteKit depuis votre page <span class="vo">[template](PUBLIC_SVELTE_SITE_URL/docs/development#template)</span> (par ex. `app.html`) qui charge votre application et navigue vers la route appropriée. Par exemple, l'hébergeur de sites statiques [Surge](https://surge.sh/help/adding-a-200-page-for-client-side-routing) vous permet d'ajouter un fichier `200.html` qui gèrera toutes les requêtes qui ne correspondent pas à un fichier statique ou une page prérendue.

Sur certains hébergeurs, cela peut être `index.html` ou quelque chose de complètement différent – consultez la documentation de votre plateforme.

> Note that the fallback page will always contain absolute asset paths (i.e. beginning with `/` rather than `.`) regardless of the value of [`paths.relative`](/docs/configuration#paths), since it is used to respond to requests for arbitrary paths.

> Notez que la page de `fallback` contiendra toujours des chemins absolus (c'est-à-dire commençant par `/` plutôt que par `.`) quelle que soit la valeur de [`paths.relative`](/docs/configuration#paths), puisqu'elle est utilisée pour répondre à des requêtes depuis n'importe quel chemin.

## Apache

Pour exécuter une <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span> sur [Apache](https://httpd.apache.org/), vous devez ajouter un fichier `static/.htaccess` pour diriger les requêtes vers votre page `fallback` :

```
<IfModule mod_rewrite.c>
	RewriteEngine On
	RewriteBase /
	RewriteRule ^200\.html$ - [L]
	RewriteCond %{REQUEST_FILENAME} !-f
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteRule . /200.html [L]
</IfModule>
```

## Prérendu individuel de pages

Si vous souhaitez uniquement que certaines pages soient prérendues, vous pouvez réactiver l'option `ssr` en plus de `prerender` pour ces parties de votre application :

```js
/// file: src/routes/my-prerendered-page/+page.js
export const prerender = true;
export const ssr = true;
```
