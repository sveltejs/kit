---
title: Netlify
---

Pour déployer sur [Netlify](https://www.netlify.com/), utilisez [`adapter-netlify`](https://github.com/sveltejs/kit/tree/main/packages/adapter-netlify).

Cet adaptateur est installé par défaut lorsque vous utilisez [`adapter-auto`](adapter-auto), mais l'ajouter à votre projet vous permet de préciser des options spécifiques à Netlify.

## Usage

Installez l'adaptateur avec `npm i -D @sveltejs/adapter-netlify`, puis ajoutez-le à votre fichier `svelte.config.js` :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		// voici les valeurs d'options par défaut.
		adapter: adapter({
			// si `true`, une Netlify Edge Function sera créée
			// plutôt que d'utiliser des fonctions standards basées sur Node
			edge: false,

			// si `true`, votre application sera découpée en plusieurs fonctions
			// au lieu de créer une seule fonction pour toute votre application.
			// si `edge` vaut `true`, cette option ne peut pas être utilisée
			split: false
		})
	}
};
```

Ensuite, assurez-vous d'avoir un fichier [netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration) à la racine de votre projet. Ce fichier va déterminer à quel endroit écrire les fichiers statiques en fonction du paramètre `build.settings`, comme le montre cet exemple de configuration :

```toml
[build]
	command = "npm run build"
	publish = "build"
```

Si le fichier `netlify.toml` ou la valeur `build.publish` est absente, une valeur par défaut de `"build"` sera utilisée. Notez que si vous avez défini le dossier de déploiement à une certaine valeur dans l'interface Netlify, vous devrez également le définir dans `netlify.toml`, ou utiliser la valeur par défaut de `"build"`.

### Version de Node

Les nouveaux projets utilisent la version LTS de Node par défaut. Toutefois, si vous mettez à jour un projet que vous avez créé il y a quelque temps, il utilise peut-être une version plus ancienne. Lisez la [documentation de Netlify](https://docs.netlify.com/configure-builds/manage-dependencies/#node-js-and-javascript) (en anglais) pour apprendre comment définir manuellement une autre version de Node.

## Netlify Edge Functions

SvelteKit supporte les [Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/). Si vous passez l'option `edge: true` à la fonction `adapter`, le rendu côté serveur se produira dans une fonction <span class="vo">[edge](PUBLIC_SVELTE_SITE_URL/docs/web#edge)</span> basée sur Deno qui sera déployée sur un serveur proche de la personne qui visite le site. Si vous définissez l'option à `false` (valeur par défaut), le site sera déployé via des Netlify Functions basées sur Node.

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		adapter: adapter({
			// va créer une Netlify Edge Function basée sur Deno
			// plutôt que d'utiliser des fonctions standards basées sur Node
			edge: true
		})
	}
};
```

## Alternatives Netlify aux fonctionnalités SvelteKit

Vous compilez peut-être votre application en utilisant des fonctionnalités directement fournies par SvelteKit sans utiliser aucune fonctionnalité Netlify. Utiliser les versions SvelteKit de ces fonctionnalités les rend disponibles en mode développement, permet de les utiliser dans des tests d'intégration, et vous garantit d'être avec d'autres adaptateurs si vous décidez un jour de déployer sur une autre plateforme que Netlify. Cependant, dans certaines situations vous trouverez peut-être plus pratique d'utiliser les versions Netlify de ces fonctionnalités. Un exemple serait la migration vers SvelteKit d'une application qui est déjà hébergée sur Netlify.

### Règles de redirection

Pendant la compilation, les règles de redirection sont automatiquement ajoutées à votre fichier `_redirects`. (S'il n'existe pas encore, il sera alors créé.) Cela signifie que :

- les `[[redirects]]` dans le fichier `netlify.toml` ne vont jamais s'appliquer, car `_redirects` est [prioritaire](https://docs.netlify.com/routing/redirects/#rule-processing-order). Précisez donc toujours vos règles dans le [fichier `_redirects`](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file).
- les règles `_redirects` ne devraient avoir aucune règle "qui gère tout" telle que `/* /foober/:splat`. Dans le cas contraire, la règle automatiquement ajoutée ne sera jamais appliquée puisque Netlify ne traite que la [première règle qui correspond](https://docs.netlify.com/routing/redirects/#rule-processing-order).

### Formulaires Netlify

1. Créez votre formulaire HTML Netlify comme décrit [ici](https://docs.netlify.com/forms/setup/#html-forms) (en anglais), par exemple sur la route `/routes/contact/+page.svelte`. (N'oubliez pas d'ajouter l'élément `<input>` caché `form-name` !)
2. Le processus de compilation de Netlify traite votre HTML au moment du déploiement, ce qui implique que votre formulaire doit être [prérendu](page-options#prerender) en tant que HTML. Vous pouvez soit ajouter `export const prerender = true` à votre `contact/+page.svelte` pour prérendre uniquement cette page, soit définir l'option `kit.prerender.force: true` pour prérendre toutes les pages.
3. Si votre formulaire Netlify a un [message personnalisé de succès](https://docs.netlify.com/forms/setup/#success-messages) comme `<form netlify ... action="/success">`, assurez-vous alors que la route `/routes/success/+page.svelte` correspondante existe et est prérendue.

### Netlify Functions

Avec cet adaptateur, les <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> SvelteKit sont hébergés en tant que [Netlify Functions](https://docs.netlify.com/functions/overview/). Les fonctions Netlify ont du contexte additionnel qui inclut des informations [Netlify Identity](https://docs.netlify.com/visitor-access/identity/). Vous pouvez accéder à ce contexte via le champ `event.platform.context` dans vos <span class="vo">[hooks](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> et vos endpoints `+page.server` ou `+layout.server`. Ces fonctions sont des [fonctions serverless](https://docs.netlify.com/functions/overview/) lorsque l'option `edge` vaut `false` dans la configuration de l'adaptateur, ou des fonctions <span class="vo">[edge](PUBLIC_SVELTE_SITE_URL/docs/web#edge)</span> lorsque l'option `edge` vaut `true`.

```js
// @errors: 2705 7006
/// file: +page.server.js
export const load = async (event) => {
	const context = event.platform.context;
	console.log(context); // s'affiche dans vos logs de fonction dans l'application Netlify
};
```

De plus, vous pouvez ajouter vos propres fonction Netlify en créant un dossier dédié et en ajoutant la configuration à votre fichier `netlify.toml`. Par exemple :

```toml
[build]
	command = "npm run build"
	publish = "build"

[functions]
	directory = "functions"
```

## Résolution de problèmes

### Accès au système de fichiers

Vous ne pouvez pas utiliser `fs` dans les déploiements edge.

Vous _pouvez_ l'utiliser dans les déploiements serverless, mais cela ne fonctionnera pas comme prévu, puisque les fichiers ne sont pas copiés depuis votre projet dans votre déploiement. A la place, utilisez la fonction `read` de `$app/server` pour accéder à vos fichiers. `read` ne fonctionne pas dans les déploiements edge (cela pourrait changer dans le futur).

À la place, vous pouvez [prerender](page-options#prerender) les routes en question.