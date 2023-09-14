---
title: Foire aux questions
---

## Autres ressources

Merci de consulter [la FAQ de Svelte](PUBLIC_SVELTE_SITE_URL/faq) ainsi que la [FAQ de `vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md) (en anglais) pour vos questions relatives à ces librairies.

## À quoi sert SvelteKit ?

SvelteKit peut être utilisé pour créer la plupart des applications. Il fournit clé en main plusieurs fonctionnalités dont :

- Du contenu de page dynamique grâce aux fonctions [load](/docs/load) et aux [routes d'API](/docs/routing#server).
- Du contenu dynamique compatible avec un référencement de qualité grâce au [rendu côté serveur (SSR)](/docs/glossary#ssr).
- Des pages interactives améliorables progressivement permettant une bonne expérience utilisateur grâce au SSR et aux [actions de formulaire](/docs/form-actions).
- Des pages statiques grâce au [prérendu](/docs/page-options#prerender).

SvelteKit peut aussi être déployé sur une grande variété d'architectures d'hébergements grâce aux [adaptateurs](/docs/adapters). Dans les situations où le rendu côté serveur est utilisé (ou si de la logique côté serveur est ajouté sans prérendu), ces fonctionnalités seront adaptées à la plateforme ciblée. Voici quelques exemples :

- Applications web dynamiques auto-hébergées sur un [serveur Node.js](/docs/adapter-node).
- Applications web <span class='vo'>[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span> avec des fonctions de chargement sur le serveur et des <span class='vo'>[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> déployées en tant que fonctions distantes. Voir la section [Déploiements sans configuration](/docs/adapter-auto) pour plus d'infos sur les options de déploiement disponibles.
- [Sites statiques prérendus](/docs/adapter-static) tels qu'un blog ou un site multi-pages hébergées sur un <span class='vo'>[CDN](PUBLIC_SVELTE_SITE_URL/docs/web#cdn)</span> ou un hébergeur de contenu statique. Les sites générées de manière statique sont déployés sans aucun serveur.
- Applications de type [SPA](/docs/single-page-apps) avec un <span class='vo'>[routing](PUBLIC_SVELTE_SITE_URL/docs/web#routing)</span> et des rendus côté client pour des contenus dynamiques se basant sur des <span class='vo'>[APIs](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>. Les SPAs sont déployées sans aucun serveur et ne sont donc pas rendues sur un serveur. Cette option est souvent choisie lorsque l'on compile SvelteKit avec une application écrite en PHP, .NET, Java, C, Golang, Rust, etc.
- Un mélange de tout ce qui précède ; certaines routes peuvent être statiques, et d'autres routes peuvent utiliser des fonctions de serveur pour récupérer des informations dynamiques. Ceci peut être configuré grâce aux [options de page](/docs/page-options) qui incluent la possibilité de désactiver le SSR.

Si vous souhaitez permettre le SSR, un serveur JS – basé par exemple sur Node.js, Deno, des fonctions <span class='vo'>[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span> ou <span class='vo'>[edge](PUBLIC_SVELTE_SITE_URL/docs/web#edge)</span> – est requis.

Il est également possible d'écrire des adaptateurs personnalisés ou de se servir des adapatateurs de la communauté pour déployer SvelteKit sur plus de plateformes tels que des environnements serveur spécialisés, des extensions de navigateur ou des applications natives. Voir la section [Intégrations](./integrations) pour plus d'exemples.

## Comment utiliser le HMR avec SvelteKit ?

SvelteKit propose le <span class='vo'>[HMR](PUBLIC_SVELTE_SITE_URL/docs/web#hmr)</span> activé par défaut grâce à [svelte-hmr](https://github.com/sveltejs/svelte-hmr). Si vous avez vu [la présentation de Rich au Svelte Summit 2020](https://svelte.dev/blog/whats-the-deal-with-sveltekit), vous avez peut-être constaté une version du HMR qui semble plus puissante. Cette démo avait activé l'option `preserveLocalState` de `svelte-hmr`. Cette option est maintenant désactivée par défaut car elle peut amener à des comportements inattendus. Mais ne vous inquiétez pas, vous bénéficiez tout de même du HMR avec SvelteKit ! Si vous souhaitez préserver l'état local vous pouvez utiliser les directives `@hmr:keep` ou `@hmr:keep-all` comme documenté sur la page de [svelte-hmr](https://github.com/sveltejs/svelte-hmr) (en anglais).

## Comment inclure les détails de mon `package.json` dans mon application ?

Vous ne pouvez pas importer directement des fichiers <span class='vo'>[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span>, puisque SvelteKit attend que le fichier [`svelte.config.js`](./configuration) soit un module ECMAScript. Si vous souhaitez inclure le numéro de version de votre application ou toute autre information de votre fichier `package.json` dans votre application, vous pouvez charger le JSON de cette manière :

```js
/// file: svelte.config.js
// @filename: index.js
/// <reference types="@types/node" />
import { URL } from 'node:url';
// ---cut---
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = fileURLToPath(new URL('package.json', import.meta.url));
const pkg = JSON.parse(readFileSync(path, 'utf8'));
```

## Comment corriger l'erreur qui se produit lorsque j'essaie d'inclure un paquet ?

La plupart des problèmes liés à l'ajout de librairies sont dus à un mauvais <span class="vo">[packaging](PUBLIC_SVELTE_SITE_URL/docs/development#bundler-packager)</span>. Vous pouvez vérifier que le paquet d'une librairie est compatible avec Node.js sur [le site publint](https://publint.dev/).

Voici quelques choses à savoir lorsque vous vérifiez si une librairie est correctement <span class="vo">[packagée](PUBLIC_SVELTE_SITE_URL/docs/development#bundler-packager)</span> :

- `exports` est prioritaire sur les autres champs de point d'entrée tels que `main` et `module`. Ajouter un champ `exports` peut ne pas être rétro-compatible car il empêche les imports profonds.
- les fichiers ESM doivent avoir une extension `.mjs` à moins que `"type": "module"` ne soit défini, et dans ce cas les fichiers CommonJS doivent avoir une extension `.cjs`.
- `main` doit être défini si `exports` ne l'est pas. Il doit pointer vers un fichier CommonJS ou ESM et satisfaire le point précédent. Si un champ `module` est défini, il doit pointer vers un fichier ESM.
- les composants Svelte doivent être distribués en tant que fichiers `.svelte` non compilés, et tout fichier JS du paquet doit être écrit en tant que module ESM uniquement. Les langages classiques de scripts et de style, comme TypeScript et SCSS, doivent être préprocessés en tant que JS et CSS vanille respectivement. Nous recommandons l'utilisation de [`svelte-package`](./packaging) pour <span class="vo">[packager](PUBLIC_SVELTE_SITE_URL/docs/development#bundler-packager)</span> une librairie Svelte, qui s'occupera de cela pour vous.

Les librairies fonctionnent mieux dans le navigateur avec Vite lorsqu'elle sont distribuées en version ESM, surtout si ce sont de dépendances d'une librairie de composants Svelte. Vous pouvez suggérer aux auteurs et autrices de librairies qu'elles fournissent une version ESM. Néanmoins, les dépendances CommonJS (CJS) devraient également fonctionner, puisque par défaut, [`vite-plugin-svelte` va demander à Vite de les pré-compiler](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies) en utilisant `esbuild` pour les convertir en ESM.

Si vous rencontrez toujours des problèmes, nous vous recommandons de faire un tour dans [les issues de Vite](https://github.com/vitejs/vite/issues) et les <span class='vo'>[issues](PUBLIC_SVELTE_SITE_URL/docs/development#issue)</span> de la librairie en question. Parfois les problèmes peuvent être contournés en jouant avec les options [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) ou [`ssr`](https://vitejs.dev/config/#ssr-options), même si nous recommandons ceci comme une solution court-terme – corriger la librairie en question est une bien meilleure solution.

## Comment utiliser l'API de transition de vue avec SvelteKit ?

Bien que SvelteKit n'ait pas d'intégration spécifique aux [transitions de vue](https://developer.chrome.com/docs/web-platform/view-transitions/), vous pouvez appeler `document.startViewTransition` dans [`onNavigate`](/docs/modules#$app-navigation-onnavigate) pour déclencher une transition de vue à chaque navigation côté client.

```js
// @errors: 2339 2810
import { onNavigate } from '$app/navigation';

onNavigate((navigation) => {
	if (!document.startViewTransition) return;

	return new Promise((resolve) => {
		document.startViewTransition(async () => {
			resolve();
			await navigation.complete;
		});
	});
});
```

Pour plus d'informations, voir ["Unlocking view transitions"](PUBLIC_SVELTE_SITE_URL/blog/view-transitions) (en anglais) sur le blog de Svelte.

## Comment utiliser X avec SvelteKit ?

Assurez-vous d'avoir lu [la section sur les intégrations](./integrations). Si vous avez toujours des problèmes, voici quelques solutions à des problèmes classiques.

### Comment mettre en place une base de données ?

Mettez le code qui requête votre base de données dans une [route de serveur](./routing#server) – ne requêtez pas la base de données dans des fichiers `.svelte`. Vous pouvez créer un fichier `db.js` ou similaire qui met en place une connection immédiatement et rend le client accessible dans votre application en tant que singleton. Vous pouvez exécuter tout code de mise en place dans le fichier `hooks.js` et importer vos utilitaires de base de données dans tout fichier de <span class='vo'>[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> qui les nécessite.

### Comment utiliser une librairie réservée au client qui dépend de `document` ou de `window` ?

Si vous avez besoin d'accéder aux variables `document` ou `window`, ou si vous avez besoin d'exécuter du code uniquement côté client, vous pouvez le faire au sein d'un bloc qui vérifie si `browser` vaut `true` :

```js
/// <reference types="@sveltejs/kit" />
// ---cut---
import { browser } from '$app/environment';

if (browser) {
	// code client uniquement
}
```

Vous pouvez aussi exécuter du code dans `onMount` si vous souhaitez qu'il soit joué après le premier rendu du composant dans le <span class='vo'>[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span> :

```js
// @filename: ambient.d.ts
// @lib: ES2015
declare module 'une-librairie-uniquement-client';

// @filename: index.js
// ---cut---
import { onMount } from 'svelte';

onMount(async () => {
	const { method } = await import('une-librairie-uniquement-client');
	method('bonjour tout le monde');
});
```

Si la librairie que vous souhaitez utiliser n'a pas d'effet de bord, vous pouvez aussi l'importer de manière statique, elle sera alors retirée lors de la compilation (grâce au <span class='vo'>[tree shaking](PUBLIC_SVELTE_SITE_URL/docs/development#tree-shaking)</span>) du code serveur compilé dans lequel `onMount` est automatiquement remplacé par une fonction inerte :

```js
// @filename: ambient.d.ts
// @lib: ES2015
declare module 'une-librairie-uniquement-client';

// @filename: index.js
// ---cut---
import { onMount } from 'svelte';
import { method } from 'une-librairie-uniquement-client';

onMount(() => {
	method('bonjour tout le monde');
});
```

Enfin, vous pouvez aussi envisager l'utilisation d'un bloc `{#await}` :

```svelte
<!--- file: index.svelte --->
<script>
	import { browser } from '$app/environment';

	const ComponentConstructor = browser ?
		import('une-librairie-uniquement-client').then((module) => module.Component) :
		new Promise(() => {});
</script>

{#await ComponentConstructor}
	<p>Chargement...</p>
{:then component}
	<svelte:component this={component} />
{:catch error}
	<p>Quelque chose s'est mal passé : {error.message}</p>
{/await}
```

### Comment utiliser un autre serveur d'API ?

Vous pouvez utiliser [`event.fetch`](./load#requ-ter-avec-fetch) pour requêter des données depuis un serveur d'<span class='vo'>[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> externe, mais ayez conscience que vous aurez besoin de gérer les [CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS), ce qui amène certaines complications telles que faire des [requêtes de pré-vérification](https://developer.mozilla.org/fr/docs/Glossary/Preflight_request), impliquant ainsi une plus grande latence. Requêter un domaine séparé peut aussi augmenter la latence à cause d'une vérification <span class='vo'>[DNS](PUBLIC_SVELTE_SITE_URL/docs/web#dns)</span> additionnelle, de la mise en place du <span class='vo'>[TLS](PUBLIC_SVELTE_SITE_URL/docs/web#tls)</span>, etc. Si vous souhaitez utiliser cette méthode, vous pourriez avoir besoin de [`handleFetch`](./hooks#hooks-de-serveur-handlefetch).

Une autre approche est de définir un <span class='vo'>[proxy](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> pour contourner les problèmes liés aux CORS. En production, vous devrez alors réécrire un chemin tel que `/api` vers le serveur d'API ; en développement local, utilisez l'option [`server.proxy`](https://vitejs.dev/config/server-options.html#server-proxy) de Vite.

La manière de mettre en place les réécritures en production va dépendre de votre plateforme de déploiement. Si les réécritures ne sont pas une option, vous pourriez alors ajouter une [route d'API](./routing#server) :

```js
/// file: src/routes/api/[...path]/+server.js
/** @type {import('./$types').RequestHandler} */
export function GET({ params, url }) {
	return fetch(`https://my-api-server.com/${params.path + url.search}`);
}
```

(Notez que vous pourriez aussi avoir besoin de relayer les requêtes `POST`/`PATCH` etc., ainsi que les `request.headers`, en fonction de vos besoins.)

### Comment utiliser des middlewares ?

L'adaptateur `adapter-node` fournit un <span class='vo'>[middleware](PUBLIC_SVELTE_SITE_URL/docs/web#middleware)</span> que vous pouvez utiliser avec votre propre serveur en production. En mode développement, vous pouvez ajouter des middlewares à Vite en utilisant un <span class='vo'>[plugin](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> Vite. Par exemple :

```js
// @errors: 2322
// @filename: ambient.d.ts
declare module '@sveltejs/kit/vite'; // TODO this feels unnecessary, why can't it 'see' the declarations?

// @filename: index.js
// ---cut---
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').Plugin} */
const myPlugin = {
	name: 'log-request-middleware',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			console.log(`Requête reçue ${req.url}`);
			next();
		});
	}
};

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [myPlugin, sveltekit()]
};

export default config;
```

Voir [la documentation Vite sur `configureServer`](https://vitejs.dev/guide/api-plugin.html#configureserver) (en anglais) pour plus de détails, notamment sur gestion de l'ordre.

### Est-ce compatible avec Yarn 2 ?

Plus ou moins. La fonctionnalité Plug'n'Play, ou "PNP", ne fonctionnera pas (elle n'est pas compatible avec l'algorithme de résolution de modules de Node, et [ne fonctionne pas encore avec les modules JavaScript natifs](https://github.com/yarnpkg/berry/issues/638), ce que SvelteKit – comme [un nombre grandissant de paquets](https://blog.sindresorhus.com/get-ready-for-esm-aa53530b3f77) – utilise). Vous pouvez utiliser `nodeLinker: 'node-modules'` dans votre fichier [`.yarnrc.yml`](https://yarnpkg.com/configuration/yarnrc#nodeLinker) pour désactiver le PNP, mais il est probablement plus facile de plutôt utiliser NPM ou [pnpm](https://pnpm.io/), qui sont tout aussi efficaces et rapides, la complexité de la compatibilité en moins.

### Est-ce compatible avec Yarn 3 ?

La compatibilité ESM avec la dernière version de Yarn (version 3) est actuellement considérée comme [expérimentale](https://github.com/yarnpkg/berry/pull/2161).

Ce qui suit semble fonctionner, même si votre cas peut être un peu différent.

Créez d'abord une nouvelle application :

```sh
yarn create svelte myapp
cd myapp
```

Et activez Yarn Berry :

```sh
yarn set version berry
yarn install
```

#### Le cache global de Yarn 3

Une des fonctionnalités les plus intéressantes de Yarn Berry est la possibilité d'avoir un seul cache global pour tous les paquets, plutôt que d'avoir plusieurs copies pour chaque projet sur le disque. Cependant, définir `enableGlobalCache` à `true` fait échouer la compilation, il est donc recommandé d'ajouter la chose suivante dans votre fichier `.yarnrc.yml` :

```yaml
nodeLinker: node-modules
```

Cette option implique que vos paquets seront téléchargés dans un dossier `node_modules` local, mais évite le problème décrit ci-dessus, et c'est actuellement votre meilleure chance d'utiliser Yarn 3.

