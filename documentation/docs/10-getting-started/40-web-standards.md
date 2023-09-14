---
title: Standards du web
---

Tout au long de cette documentation, vous trouverez des références aux [APIs Web](https://developer.mozilla.org/fr/docs/Web/API) standards sur lesquelles s'appuie SvelteKit. Plutôt que de réinventer la roue, SvelteKit _utilise la plateforme_, ce qui signifie que vos compétences en développement web sont utilisables avec SvelteKit. De même, le temps passé à apprendre SvelteKit vous aidera à progresser en tant que développeur ou développeuse web de manière générale.

Ces <span class="vo">[APIs](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> sont disponibles dans tous les navigateurs modernes et dans de nombreux environnements hors navigateur, comme les "Cloudflare Workers", ou les "Edge Functions" de Deno et Vercel. Pendant le développement, et au sein des [adaptateurs](adapters) d'environnement Node (dont AWS Lambda), elles sont rendues disponibles via des <span class="vo">[polyfills](PUBLIC_SVELTE_SITE_URL/docs/javascript#polyfill)</span> lorsque nécessaire (en tout cas pour le moment — Node ajoute de plus en plus de standards web).

En particulier, vous deviendrez familier•e•s avec :

## APIs Fetch

Svelte utilise [`fetch`](https://developer.mozilla.org/fr/docs/Web/API/fetch) pour récupérer la donnée du réseau. Cette méthode est disponible dans les [hooks](hooks) et les [routes serveur](routing#server) ainsi que dans le navigateur.

> Une version spéciale de `fetch` est disponible dans les fonctions [`load`](load), dans les [hooks server](hooks#hooks-de-serveur), ainsi que dans les [routes d'API serveur](routing#server) pour appeler des <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> directement lors du rendu côté serveur, sans faire d'appel HTTP tout en préservant les identifiants. (Pour faire des appels identifiés dans du code serveur en dehors de `load`, vous devez explicitement passer des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `cookie` et/ou `authorization`.) Elle vous permet également de faire des requêtes relatives, là où un `fetch` côté serveur vous impose normalement une URL complète.

En plus de `fetch`, l'[API Fetch](https://developer.mozilla.org/fr/docs/Web/API/Fetch_API) inclut les interfaces suivantes :

### Request

Une instance de [`Request`](https://developer.mozilla.org/fr/docs/Web/API/Request) est accessible dans les [hooks](hooks) et les [routes serveur](routing#server) en tant que `event.request`. Elle contient des méthodes utiles comme `request.json()` et `request.formData()` pour récupérer la donnée envoyée au <span class="vo">[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span>.

### Response

Une instance de [`Response`](https://developer.mozilla.org/fr/docs/Web/API/Response) est renvoyée de `await fetch(...)` et des fonctions des fichiers `+server.js`. Au fond, une application SvelteKit est une machine à tranformer une `Request` en `Response`.

### Headers

L'interface [`Headers`](https://developer.mozilla.org/fr/docs/Web/API/Headers) vous permet de lire les `request.headers` entrants et de définir des `response.headers` sortants. Par exemple, vous pouvez récupérer les `request.headers` comme montré ci-dessous, et utiliser la [fonction utilitaire `json`](modules#sveltejs-kit-json) pour envoyer des `response.headers` modifiés :

```js
// @errors: 2461
/// file: src/routes/what-is-my-user-agent/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ request }) {
	// affiche tous les headers
	console.log(...request.headers);

	// crée une Response JSON en utilisant un header reçu
	return json({
		// récupère un header spécifique
		userAgent: request.headers.get('user-agent')
	}, {
		// définit un header sur la réponse
		headers: { 'x-custom-header': 'potato' }
	});
}
```

## FormData

Lorsque vous recevez des soumissions natives de formulaire HTML, vous avez affaire avec des objets [`FormData`](https://developer.mozilla.org/fr/docs/Web/API/FormData).

```js
// @errors: 2461
/// file: src/routes/hello/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const body = await event.request.formData();

	// affiche tous les champs
	console.log([...body]);

	return json({
		// récupère une valeur spécifique
		name: body.get('name') ?? 'world'
	});
}
```

## APIs de Stream

La plupart du temps, vos <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> vous renverront des données complètes, comme dans l'exemple `userAgent` ci-dessus. Parfois, vous pourriez avoir besoin de renvoyer une réponse trop lourde pour être envoyée en une seule fois, ou de renvoyer la donnée en morceaux, et pour cela la plateforme fournit des [streams](https://developer.mozilla.org/fr/docs/Web/API/Streams_API) — [ReadableStream](https://developer.mozilla.org/fr/docs/Web/API/ReadableStream), [WritableStream](https://developer.mozilla.org/fr/docs/Web/API/WritableStream) et [TransformStream](https://developer.mozilla.org/fr/docs/Web/API/TransformStream).

## APIs d'URL

Les URLs sont représentées par l'interface [`URL`](https://developer.mozilla.org/fr/docs/Web/API/URL), qui inclut des propriétés utiles comme `origin` et `pathname` (et `hash` dans le navigateur). Cette interface est utilisée à différents endroits — `event.url` dans les [hooks](hooks) et les [routes de serveur](routing#server), [`$page.url`](modules#$app-stores) dans les [pages](routing#page), `from` et `to` dans les fonctions [`beforeNavigate` et `afterNavigate`](modules#$app-navigation) et ainsi de suite.

### URLSearchParams

Peu importe où vous rencontrez une URL, vous pouvez toujours accéder aux paramètres de recherche via `url.searchParams`, qui est une instance de [`URLSearchParams`](https://developer.mozilla.org/fr/docs/Web/API/URLSearchParams) :

```js
// @filename: ambient.d.ts
declare global {
	const url: URL;
}

export {};

// @filename: index.js
// ---cut---
const foo = url.searchParams.get('foo');
```

## Web Crypto

L'[API Web Crypto](https://developer.mozilla.org/fr/docs/Web/API/Web_Crypto_API) est rendue disponible via le module global `crypto`. Elle est utilisée en interne pour les <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> de [Content Security Policy](configuration#csp), mais vous pouvez également vous en servir pour par exemple générer des identifiants UUID :

```js
const uuid = crypto.randomUUID();
```
