---
title: Cloudflare Pages
---

Pour déployer sur [Cloudflare Pages](https://developers.cloudflare.com/pages/), utilisez [`adapter-cloudflare`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare).

Cet adaptateur est installé par défaut lorsque vous utilisez [`adapter-auto`](adapter-auto). Si vous prévoyez de rester sur Cloudflare Pages, vous pouvez supprimer [`adapter-auto`](adapter-auto) pour utiliser directement cet adaptateur de sorte que les déclarations de types soit automatiquement appliquées et que vous puissiez utiliser les options spécifiques à Cloudflare.

## Comparaisons

- `adapter-cloudflare` – supporte toutes les fonctionnalités de SvelteKit ; compile pour [Cloudflare Pages](https://blog.cloudflare.com/cloudflare-pages-goes-full-stack/)
- `adapter-cloudflare-workers` – supporte toutes les fonctionnalités de SvelteKit ; copmile pour Cloudflare Workers
- `adapter-static` – produit uniquement des fichiers statiques pour le client ; compatible avec Cloudflare Pages

## Usage

Installez l'adaptateur avec `npm i -D @sveltejs/adapter-cloudflare`, puis ajoutez-le à votre fichier `svelte.config.js` :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
	kit: {
		adapter: adapter({
			// Voir plus bas pour une explication de ces options
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		})
	}
};
```

## Options

L'options `routes` vous permet de personnaliser le fichier [`_routes.json`](https://developers.cloudflare.com/pages/platform/functions/routing/#create-a-_routesjson-file) généré par `adapter-cloudflare`.

- `include` définit les routes qui vont invoquer une fonction, et vaut `['/*']` par défaut
- `exclude` définit les routes qui ne vont _pas_ invoquer une fonction – c'est une méthode plus rapide et moins coûteuse de servir les fichiers statiques de votre application. Ce tableau peut inclure les valeurs spéciales suivantes :
	- `<build>` contient les artefacts de compilation de votre application (les fichiers sont générés par Vite)
	- `<files>` contient le contenu de votre dossier `static`
	- `<prerendered>` contient une liste de pages prérendues
	- `<all>` (valeur par défaut) contient tout ce qui est listé au-dessus

Vous pouvez avoir jusqu'à 100 règles `include` et `exclude` combinées. Vous pouvez en général omettre l'option `routes`, mais si (par exemple) vos chemins `<prerendered>` dépassent cette limite, vous trouverez probablement utile de créer manuellement une liste `exclude` qui contient `'articles/*'` plutôt que la liste auto-générée `['/articles/foo', '/articles/bar', '/articles/baz', ...]`.

## Déploiement

Merci de suivre le guide de Cloudflare Pages [Get Started Guide](https://developers.cloudflare.com/pages/get-started) (en anglais) pour commencer.

Lorsque vous configurez vos paramètres de projet, vous devez utiliser les paramètres suivants :

- **Framework preset** – SvelteKit
- **Build command** – `npm run build` ou `vite build`
- **Build output directory** – `.svelte-kit/cloudflare`

## Bindings

L'objet [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) contient les [bindings](https://developers.cloudflare.com/pages/platform/functions/bindings/) de votre projet, qui consistent en des <span class="vo">[namespaces](PUBLIC_SVELTE_SITE_URL/docs/development#namespace)</span> KV/DO, etc. Il est fourni à SvelteKit via la propriété `platform`, conjointement à `context` et `caches`, ce qui signifie que vous pouvez y accéder dans les <span class="vo">[hooks](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> et les <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> :

```js
// @errors: 7031
export async function POST({ request, platform }) {
	const x = platform.env.YOUR_DURABLE_OBJECT_NAMESPACE.idFromName('x');
}
```

> Vous devriez plutôt utiliser le module intégré de SvelteKit `$env` pour gérer vos variables d'environnement.

Pour rendre ces types accessibles dans votre application, référencez-les dans votre fichier `src/app.d.ts` :

```diff
/// file: src/app.d.ts
declare global {
	namespace App {
		interface Platform {
+			env?: {
+				YOUR_KV_NAMESPACE: KVNamespace;
+				YOUR_DURABLE_OBJECT_NAMESPACE: DurableObjectNamespace;
+			};
		}
	}
}

export {};
```

### Tester localement

`platform.env` est uniquement accessible dans le <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> final, et donc pas en mode développement. Pour tester le build, vous pouvez utiliser [wrangler](https://developers.cloudflare.com/workers/cli-wrangler) **version 3**. Une fois que vous avez compilé votre site, lancez la commande `wrangler pages dev .svelte-kit/cloudflare`. Assurez-vous d'avoir vos [bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) dans votre fichier `wrangler.toml`.

## Notes

Les fonctions contenues dans le dossier `/functions` à la racine de votre projet ne seront _pas_ inclues dans le déploiement, qui est compilé en un seul [fichier `_worker.js`](https://developers.cloudflare.com/pages/platform/functions/#advanced-mode). Les fonctions devraient être implémentées en tant que [endpoints de serveur](routing#server) dans votre application SvelteKit.

Les fichiers `_headers` et `_redirects` spécifiques à Cloudflare Pages peuvent être utilisés pour les réponses de fichiers statiques (comme les images) en les plaçant dans le dossier `/static`.

Cependant, ils n'auront aucun effet sur les réponses dynamiquement générées par SvelteKit, qui renvoie des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> personnalisés ou des réponses de redirections depuis les [endpoints de serveur](routing#server) ou le [hook `handle`](hooks#hooks-de-serveur-handle)

## Résolution de problèmes

### Plus de lecture

Vous pouvez vous référer à la [documentation de Cloudflare pour déployer un site SvelteKit](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-site) (en anglais).

### Accès au système de fichiers

Vous ne pouvez pas utiliser `fs` dans les <span class="vo">[workers](PUBLIC_SVELTE_SITE_URL/docs/development#worker)</span> Cloudflare - vous devez [prérendre](page-options#prerender) les routes en question.
