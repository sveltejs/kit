---
title: Cloudflare Workers
---

Pour déployer sur [Cloudflare Workers](https://workers.cloudflare.com/), utilisez [`adapter-cloudflare-workers`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare-workers).

> À moins d'avoir une raison précise d'utiliser `adapter-cloudflare-workers`, nous recommandons plutôt d'utiliser `adapter-cloudflare`. Les deux adaptateurs sont équivalents, mais Cloudflare Pages vous offre des fonctionnalités comme l'intégration Github avec des <span class="vo">[builds](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> et déploiements automatisés, des aperçus de déploiement, des retours en arrière instantanés, et d'autres choses.

## Usage

Installez l'adaptateur avec `npm i -D @sveltejs/adapter-cloudflare-workers`, puis ajoutez-le à votre fichier `svelte.config.js` :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## Configuration de base

Cet adaptateur attend un fichier [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) à la racine de votre projet. Il doit avoir cette forme :

```toml
/// file: wrangler.toml
name = "<your-service-name>"
account_id = "<your-account-id>"

main = "./.cloudflare/worker.js"
site.bucket = "./.cloudflare/public"

build.command = "npm run build"

compatibility_date = "2021-11-12"
workers_dev = true
```

`<your-service-name>` peut être n'importe quoi. `<your-account-id>` peut être récupéré en vous connectant à votre [espace Cloudflare](https://dash.cloudflare.com) et en l'extrayant de la fin de l'URL :

```
https://dash.cloudflare.com/<your-account-id>
```

> Vous devriez ajouter le dossier `.cloudflare` (ou tout dossier défini en tant que `main` et `site.bucket`) à votre fichier `.gitignore`.

Vous aurez besoin d'installer [wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) et de vous y connecter, si vous ne l'avez pas déjà fait :

```
npm i -g wrangler
wrangler login
```

Puis, vous pouvez compiler votre application et la déployer :

```sh
wrangler deploy
```

## Configuration personnalisée

Si vous souhaitez utiliser un fichier de configuration autre que `wrangler.toml`, vous pouvez le faire ainsi :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
	kit: {
		adapter: adapter({ config: '<your-wrangler-name>.toml' })
	}
};
```

Si vous souhaitez activer la [compatibilité Node.js](https://developers.cloudflare.com/workers/runtime-apis/nodejs/#enable-nodejs-from-the-cloudflare-dashboard) (en anglais), vous pouvez ajouter l'attribut "nodejs_compat" au fichier `wrangler.toml` :

```toml
/// file: wrangler.toml
compatibility_flags = [ "nodejs_compat" ]
```

## Bindings

L'objet [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) contient les [bindings](https://developers.cloudflare.com/workers/platform/environment-variables/) de votre projet, qui consistent en des <span class="vo">[namespaces](PUBLIC_SVELTE_SITE_URL/docs/development#namespace)</span> KV/DO, etc. Il est fourni à SvelteKit via la propriété `platform`, conjointement à `context` et `caches`, ce qui signifie que vous pouvez y accéder dans les <span class="vo">[hooks](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> et les <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> :

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

`platform.env` est uniquement accessible dans le <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> final, et donc pas en mode développement. Pour tester le build, vous pouvez utiliser [wrangler](https://developers.cloudflare.com/workers/cli-wrangler). Une fois que vous avez compilé votre site, lancez la commande `wrangler pages dev .svelte-kit/cloudflare`. Assurez-vous d'avoir vos [bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) dans votre fichier `wrangler.toml`. La version 3 de Wrangler est recommandée.

## Résolution de problèmes

### Limites de taille de Worker

Lorsque vous déployez sur des <span class="vo">[workers](PUBLIC_SVELTE_SITE_URL/docs/development#worker)</span>, le serveur généré par SvelteKit est compilé en un seul fichier. Wrangler échouera à publier votre worker s'il excède la [limite de taille](https://developers.cloudflare.com/workers/platform/limits/#worker-size) après minification. Vous ne devriez normalement pas dépasser cette limite, mais certaines grosses librairies peuvent vous faire rencontrer ce problème. Dans ce cas, essayez de réduire la taille de votre worker en important ce type de librairie uniquement côté client. Lire la [FÀQ](./faq#comment-utiliser-x-avec-sveltekit-comment-utiliser-une-librairie-r-serv-e-au-client-qui-d-pend-de-document-ou-de-window) pour plus d'informations.

### Accès au système de fichiers

Vous ne pouvez pas utiliser `fs` dans les <span class="vo">[workers](PUBLIC_SVELTE_SITE_URL/docs/development#worker)</span> Cloudflare - vous devez [prérendre](page-options#prerender) les routes en question.
