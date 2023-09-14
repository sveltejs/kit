---
title: Service workers
---

Les _service workers_ sont des scripts qui jouent le rôle de <span class="vo">[proxy](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> afin de gérer les requêtes réseau au sein de votre application. Cela rend possible le fonctionnement hors-ligne de votre application, mais même si vous n'avez pas besoin d'un support hors-ligne (ou si vous ne pouvez pas vraiment l'implémenter à cause du type d'application que vous développez), il est souvent pertinent d'utiliser des service workers pour accélérer la navigation en mettant en cache de manière anticipée votre JS et votre CSS.

Dans SvelteKit, si vous avez un fichier `src/service-worker.js` (ou `src/service-worker/index.js`), celui-ci sera compilé et automatiquement activé. Vous pouvez modifier l'[emplacement de votre service worker](configuration#files) si nécessaire.

Vous pouvez [désactiver l'activation automatique](configuration#serviceworker) si vous souhaitez activer le service worker selon votre propre logique ou utiliser une autre solution. L'activation par défaut ressemble à quelque chose comme ça :

```js
if ('serviceWorker' in navigator) {
	addEventListener('load', function () {
		navigator.serviceWorker.register('./path/to/service-worker.js');
	});
}
```

## À l'intérieur du service worker

Au sein du service worker, vous avez accès au [module `$service-worker`](modules#$service-worker), qui vous fournit les chemins de tous les fichiers statiques, fichiers compilés et pages prérendues. Vous avez également accès à la chaîne de caractères représentant la version de votre application, que vous pouvez utiliser pour créer un nom de cache unique, ainsi qu'au chemin de `base` du déploiement. Si votre configuration Vite précise l'option `define` (utilisée pour les remplacements de variables globales), celle-ci sera appliquée à vos service workers ainsi qu'à vos <span class="vo">[builds](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> serveur/client.

L'exemple suivant met en cache immédiatement l'application compilée ainsi que tout fichier du dossier `static`, et met toutes les autres requêtes en cache au fur et à mesure qu'elles se produisent. Cela permet de rendre disponible chaque page en hors-ligne après une première visite.

```js
// @errors: 2339
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Crée un nom de cache unique pour ce déploiement
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // l'application elle-même
	...files  // tout ce qu'il y a dans 'static'
];

self.addEventListener('install', (event) => {
	// Crée un nouveau cache et y ajoute tous les fichiers
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore les requêtes POST etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` peuvent toujours être servis depuis le cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// pour tout le reste, commence par essayer le réseau,
		// mais utilise le cache si nous sommes hors-ligne
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// if there's no cache, then just error out
			// as there is nothing we can do to respond to this request
			throw err;
		}
	}

	event.respondWith(respond());
});
```

> Soyez vigilant•e•s lorsque vous mettez en cache ! Dans certains cas, afficher des données périmées peut être plus problématique que ne pas afficher de données si vous être hors-ligne. De plus, puisque les navigateurs vident leur cache si celui-ci se remplit trop, vous devriez également faire attention lorsque vous choisissez de mettre en cache de gros fichiers comme des vidéos.

## Pendant le développement

Les service workers sont utilisés pour la production, mais pas pendant le développement. Pour cette raison, seuls les navigateurs qui supportent les [modules dans les service workers](https://web.dev/es-modules-in-sw) (en anglais) seront capables de les utiliser pendant que vous développez. Si vous activez manuellement votre service worker, vous aurez besoin d'utiliser l'option `{ type: 'module' }` pendant le développement :

```js
import { dev } from '$app/environment';

navigator.serviceWorker.register('/service-worker.js', {
	type: dev ? 'module' : 'classic'
});
```

> `build` et `prerendered` sont des tableaux vides pendant le développement

## Typage

Mettre en place un typage correct pour les service workers nécessite un peu de préparation manuelle. Dans votre fichier `service-worker.js`, ajoutez ce qui suit en haut de votre fichier :

```original-js
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
```
```generated-ts
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;
```

Ceci désactive l'accès aux types du <span class="vo">[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span> comme `HTMLElement` qui ne sont pas disponibles dans un service worker, et instancie les bonnes variables globales. La réassignation de `self` en `sw` vous permet également de lui assigner le bon type (il y a plusieurs moyens pour faire cela, mais celui-ci est le plus simple sans rajouter de fichier). Utilisez `sw` au lieu de `self` dans le reste de votre fichier. La référence aux types de SvelteKit assure que l'import de `$service-worker` est correctement typé.

## Autres solutions

L'implémentation des service workers dans SvelteKit est délibérément bas niveau. Si vous avez besoin d'une solution plus clé-en-main, nous vous recommandons de vous tourner vers [le plugin Vite PWA](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html), qui utilise [Workbox](https://web.dev/learn/pwa/workbox). Pour plus d'informations sur les service workers, nous vous recommandons de lire la [documentation de MDN sur le sujet](https://developer.mozilla.org/fr/docs/Web/API/Service_Worker_API/Using_Service_Workers).
