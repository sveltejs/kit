---
title: Migrer depuis Sapper
rank: 1
---

SvelteKit est le successeur de Sapper, et contient plusieurs éléments de son design.

Si vous avez une application Sapper que vous prévoyez de migrer vers SvelteKit, il y a plusieurs modifications que vous aurez besoin de faire. Vous pouvez prendre comme référence [quelques exemples](additional-resources#exemples) lors de votre migration.

## `package.json`

### `type: "module"`

Ajoutez `"type": "module"` dans votre fichier `package.json`. Vous pouvez faire ceci séparemment du reste si vous utilisez Sapper 0.29.3 ou plus récent.

### `dependencies`

Supprimez `polka` ou `express` si vous les utilisez, et tout <span class='vo'>[middleware](PUBLIC_SVELTE_SITE_URL/docs/web#middleware)</span> tel que `sirv` ou `compression`.

### `devDependencies`

Supprimez `sapper` de vos `devDependencies` et remplacez-le par `@sveltejs/kit` et tout [adaptateur](adapters) que vous prévoyez d'utiliser (voir [section suivante](migrating#fichiers-de-projet-configuration)).

### `scripts`

Tout script qui fait référence à `sapper` doit être mis à jour :

- `sapper build` devient `vite build` avec l'[adaptateur](adapters) Node
- `sapper export` devient `vite build` avec l'[adaptateur](adapters) statique
- `sapper dev` devient `vite dev`
- `node __sapper__/build` devient `node build`

## Fichiers de projet

Le coeur de votre application, dans le dossier `src/routes`, peut rester à sa place, mais plusieurs fichiers de projet doivent être déplacés ou mis à jour.

### Configuration

Votre fichier `webpack.config.js` ou `rollup.config.js` doit être remplacé par un fichier `svelte.config.js`, comme documenté [ici](configuration). Les options du pré-processeur Svelte doivent être déplacées dans `config.preprocess`.

Vous devez ajouter un [adaptateur](adapters). `sapper build` est vaguement équivalent à [adapter-node](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) tandis que `sapper export` est vaguement équivalent à [adapter-static](https://github.com/sveltejs/kit/tree/main/packages/adapter-static), bien que vous préfèrerez peut-être utiliser un adaptateur prévu pour la plateforme sur laquelle vous souhaitez déployer.

Si vous utilisiez des <span class='vo'>[plugins](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> pour traiter des types de fichiers qui ne sont pas automatiquement gérés par [Vite](https://vitejs.dev), vous aurez besoin de trouver des équivalents Vite, et de les ajouter à votre [configuration Vite](project-structure#fichiers-de-projet-vite-config-js).

### `src/client.js`

Ce fichier n'a pas d'équivalent dans SvelteKit. Toute logique personnalisée (autre que `sapper.start(...)`) doit être incluse dans votre fichier `+layout.svelte`, dans un <span class='vo'>[callback](PUBLIC_SVELTE_SITE_URL/docs/development#callback)</span> `onMount`.

### `src/server.js`

Ce fichier est l'équivalent d'un [serveur personnalisé](adapter-node#serveur-personnalis) lorsque vous utilisez `adapter-node`. Dans les autres cas, ce fichier n'a pas d'équivalent, puisque les applications SvelteKit peuvent être exécutées dans des environnements <span class='vo'>[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span>.

### `src/service-worker.js`

La plupart des imports depuis `@sapper/service-worker` ont des équivalents dans [`$service-worker`](modules#$service-worker) :

- `files` est inchangé
- `routes` a été supprimé
- `shell` est maintenant `build`
- `timestamp` est maintenant `version`

### `src/template.html`

Le fichier `src/template.html` doit être renommé `src/app.html`.

Supprimez `%sapper.base%`, `%sapper.scripts%` et `%sapper.styles%`. Remplacez `%sapper.head%` par `%sveltekit.head%` et `%sapper.html%` par `%sveltekit.body%`. La balise `<div id="sapper">` n'est plus nécessaire.

### `src/node_modules`

Une habitude classique dans les applications Sapper est de mettre votre librairie interne dans un dossier à l'intérieur de `src/node_nodules`. Ceci ne fonctionne pas avec Vite, nous utilisons à la place [`src/lib`](modules#$lib).

## Pages et layouts

### Fichiers renommés

Les routes sont maintenant définies à partir du nom de dossier exclusivement pour lever toute ambiguité, les noms de dossier menant à un fichier `+page.svelte` correspondent à la route. Voir [la section Routing](routing) pour un aperçu du fonctionnement. Le tableau suivant présente une comparaison avant/après :

| Sapper                       | SvelteKit                       |
| ---------------------------- | ------------------------------- |
| routes/about/index.svelte    | routes/about/+page.svelte       |
| routes/about.svelte          | routes/about/+page.svelte       |

Votre composant de page d'erreur doit être renommé de `_error.svelte` en `+error.svelte`. Tout fichier `_layout.svelte` doit être renommé en `+layout.svelte`. [Tout autre fichier est ignoré](routing#autres-fichiers).

### Imports

Les imports `goto`, `prefetch` et `prefetchRoutes` depuis `@sapper/app` doivent être remplacés par les imports `goto`, `preloadData` et `preloadCode` respectivement depuis [`$app/navigation`](modules#$app-navigation).

L'import `stores` depuis `@sapper/app` doit être remplacé – voir la section sur les [Stores](#pages-et-layouts-stores) plus bas.

Tout fichier que vous importiez précédemment depuis des dossiers de `src/node_modules` doit maintenant être importé depuis [`$lib`](modules#$lib).

### Préchargement

Comme précédemment, les pages et <span class='vo'>[layout](PUBLIC_SVELTE_SITE_URL/docs/development#layout)</span> peuvent exporter une fonction qui permet de charger des données avant que le rendu n'ait lieu.

Cette fonction a été renommée de `preload` en [`load`](load), et doit maintenant être définie dans un fichier `+page.js` (ou `+layout.js`) à côté du fichier `+page.svelte` (ou `+layout.svelte`) correspondant, et son <span class='vo'>[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> a changé. Elle n'attend plus deux arguments – `page` et `session` – mais un seul argument `event`.

Il n'y a plus d'objet `this`, et par conséquent plus de `this.fetch`, `this.error` ou `this.redirect`. À la place, vous pouvez récupérer la méthode [`fetch`](load#requ-ter-avec-fetch) dans les méthodes fournies, et les méthodes [`error`](load#erreurs) et [`redirect`](load#redirections) sont maintenant levées.

### Stores

Avec Sapper, vous obteniez les références des <span class='vo'>[stores](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#store)</span> intégrés de cette façon :

```js
// @filename: ambient.d.ts
declare module '@sapper/app';

// @filename: index.js
// ---cut---
import { stores } from '@sapper/app';
const { preloading, page, session } = stores();
```

Le store `page` existe toujours ; `preloading` a été remplacé par un store `navigating` qui contient les propriétés `from` et `to`. Le store `page` contient maintenant les propriétés `url` et `params`, mais pas `path` ou `query`.

Vous y accédez de manière différente avec SvelteKit. `stores` est maintenant `getStores`, mais dans la plupart des cas ce n'est pas nécessaire puisque vous pouvez importer `navigating` et `page` directement depuis [`$app/stores`](modules#$app-stores).

### Routing

Il n'est plus possible de définir des routes utilisant des expressions régulières. À la place, vous devez utiliser [la fonctionnalité avancée des fonctions `match`](advanced-routing#fonctions-match).

### Segments

Auparavant, les composants de <span class='vo'>[layout](PUBLIC_SVELTE_SITE_URL/docs/development#layout)</span> recevaient une <span class='vo'>[prop](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#prop)</span> `segment` indiquant le segment enfant. Ceci a été supprimé de SvelteKit ; vous devez maintenant utiliser la valeur `$page.url.pathname`, qui offre plus de flexibilité et vous permet notamment de récupérer le segment qui vous intéresse.

### URLs

Avec Sapper, toutes les URLs relatives étaient résolues par rapport à l'URL de base – en général `/`, à moins que l'option `basepath` ait été utilisée – plutôt que par rapport à la page courante.

Ceci a causé des problèmes et n'est donc plus le cas avec SvelteKit. À la place, les URLs relatives sont résolues par rapport à la page courante (ou la page de destination, pour les URLs en argument de `fetch` dans les fonctions `load`). Dans la plupart des cas, il est plus simple d'utiliser des URLs relatives à la racine (c'est-à-dire commencant par `/`), puisque leur signification ne dépend pas du contexte.

### Attributs &lt;a&gt;

- `sapper:prefetch` est maintenant `data-sveltekit-preload-data`
- `sapper:noscroll` est maintenant `data-sveltekit-noscroll`

## Endpoints

Avec Sapper, les [routes de serveur](routing#server) recevaient des objets `req` et `res` exposés par le module `http` de Node (ou les versions augmentées par les <span class='vo'>[frameworks](PUBLIC_SVELTE_SITE_URL/docs/web#framework)</span> comme Polka ou Express).

SvelteKit est conçu pour être agnostique de l'endroit où l'application est exécutée – cela peut être un serveur node, mais pourrait tout aussi bien être une plateforme <span class='vo'>[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span> ou un Cloudflare Worker. Pour cette raison, vous ne pouvez plus directement interagir avec `req` ou `res`. Vos <span class='vo'>[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> doivent être mis à jour pour correspondre à la nouvelle signature.

Pour supporter ce comportement indépendant de l'environnement d'exécution, `fetch` est maintenant disponible dans le contexte global, vous n'avez donc plus besoin d'importer `node-fetch`, `cross-fetch` ou toute autre implémentation serveur de `fetch` pour pouvoir vous en servir.

## Intégrations

Voir [la section sur les intégrations](./integrations) pour des informations détaillées sur les intégrations.

### `html-minifier`

Sapper inclut `html-minifier` par défaut. SvelteKit ne l'inclut pas, mais vous pouvez l'ajouter comme dépendance de production et l'utiliser via un [hook](hooks#hooks-de-serveur-handle) :

```js
// @filename: ambient.d.ts
/// <reference types="@sveltejs/kit" />
declare module 'html-minifier';

// @filename: index.js
// ---cut---
import { minify } from 'html-minifier';
import { building } from '$app/environment';

const minification_options = {
	collapseBooleanAttributes: true,
	collapseWhitespace: true,
	conservativeCollapse: true,
	decodeEntities: true,
	html5: true,
	ignoreCustomComments: [/^#/],
	minifyCSS: true,
	minifyJS: false,
	removeAttributeQuotes: true,
	removeComments: false, // certains codes d'hydratation nécessitent des commentaires, vous ne devriez donc pas les enlever
	removeOptionalTags: true,
	removeRedundantAttributes: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
	sortAttributes: true,
	sortClassName: true
};

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let page = '';

	return resolve(event, {
		transformPageChunk: ({ html, done }) => {
			page += html;
			if (done) {
				return building ? minify(page, minification_options) : page;
			}
		}
	});
}
```

Notez que `prerendering` vaut `false` lorsque vous utilisez `vite preview` pour tester le <span class='vo'>[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> de production de votre site. Pour vérifier les résultats de la minification, vous avez besoin d'inspecter directement les fichiers HTML compilés.
