---
title: Routing
---

Le cœur de SvelteKit est un _routeur basé sur l'arborescence de fichiers_. Les routes de votre application — c'est-à-dire les URLs auxquelles les utilisateurs et utilisatrices ont accès — sont définies par les dossiers de votre projet :

- `src/routes` est la route racine
- `src/routes/about` crée une route `/about`
- `src/routes/blog/[slug]` crée une route avec un _paramètre_, `slug`, qui peut être utilisé pour charger des données dynamiquement lorsque quelqu'un demande une page comme `/blog/hello-world`

> Vous pouvez utiliser un autre dossier que `src/routes` en modifiant la [configuration du projet](configuration).

Chaque dossier de route continent un ou plusieurs _fichiers de route_, que vous pouvez reconnaître à leur préfixe `+`.

## +page

### +page.svelte

Un composant `+page.svelte` définit une page de votre application. Par défaut, les pages sont rendues à la fois sur le serveur ([SSR](glossary#ssr)) lors la requête initiale et dans le navigateur ([CSR](glossary#csr)) pour les navigations suivantes.

```svelte
<!--- file: src/routes/+page.svelte --->
<h1>Bonjour et bienvenue sur mon site !</h1>
<a href="/about">À propos de mon site</a>
```

```svelte
<!--- file: src/routes/about/+page.svelte --->
<h1>À propos de ce site</h1>
<p>À FAIRE...</p>
<a href="/">Accueil</a>
```

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
```

> Notez que SvelteKit utilise des éléments `<a>` pour naviguer entre les routes, plutôt qu'un composant `<Link>` qui serait spécifique au framework.

### +page.js

Souvent, une page a besoin de charger des données avant qu'elle ne puisse être rendue. Pour cela, il suffit d'ajouter un module `+page.js` qui exporte une fonction `load` :

```js
/// file: src/routes/blog/[slug]/+page.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	if (params.slug === 'hello-world') {
		return {
			title: 'Bonjour tout le monde !',
			content: 'Bienvenue sur notre blog. Lorem ipsum dolor sit amet...'
		};
	}

	error(404, 'Introuvable');
}
```

Cette fonction s'exécute avec `+page.svelte`, ce qui signifie qu'elle est exécutée sur le serveur lors du rendu côté serveur et dans le navigateur lors de la navigation côté client. Voir [`load`](load) pour plus de détails sur l'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>.

En plus de `load`, `+page.js` peut exporter des valeurs qui configurent le comportement de la page :

- `export const prerender = true` ou `false` ou `'auto'`
- `export const ssr = true` ou `false`
- `export const csr = true` ou `false`

Vous trouverez plus d'informations sur ces valeurs dans la section [options de page](page-options).

### +page.server.js

Si votre fonction `load` doit impérativement être exécutée sur le serveur — par exemple, si elle a besoin de récupérer des données dans une base de données, ou si elle a besoin d'accéder à des [variables d'environnement privées](modules#$env-static-private) comme des clés d'API — vous pouvez alors renommer `+page.js` en `+page.server.js` et changer le type `PageLoad` en `PageServerLoad`.

```js
/// file: src/routes/blog/[slug]/+page.server.js

// @filename: ambient.d.ts
declare global {
	const getPostFromDatabase: (slug: string) => {
		title: string;
		content: string;
	}
}

export {};

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const post = await getPostFromDatabase(params.slug);

	if (post) {
		return post;
	}

	error(404, 'Introuvable');
}
```

Lors de la navigation côté client, SvelteKit va charger cette donnée sur le serveur, ce qui implique que la valeur renvoyée doit être sérialisable avec [devalue](https://github.com/rich-harris/devalue). Voir [`load`](load) pour plus de détails sur l'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>.

Comme `+page.js`, `+page.server.js` peut exporter des [options de page](page-options) — `prerender`, `ssr` et `csr`.

Un fichier `+page.server.js` peut également exporter des _actions_. Si `load` vous permet de lire des données sur le serveur, les `actions` vous permettent d'_écrire_ des données sur le serveur en utilisant l'élément `<form>`. Pour savoir comment vous en servir, reportez-vous à la section sur les [actions de formulaire](form-actions).

## +error

Si une erreur survient durant `load`, SvelteKit affiche une page d'erreur par défaut. Vous pouvez personnaliser cette page d'erreur en fonction de la route en ajoutant un fichier `+error.svelte` :

```svelte
<!--- file: src/routes/blog/[slug]/+error.svelte --->
<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.status}: {$page.error.message}</h1>
```

SvekteKit "remonte l'arborescence de fichiers" à la recherche de la page d'erreur la plus proche — si le fichier de l'exemple ci-dessus n'existe pas, il essaie de trouver `src/routes/blog/+error.svelte` puis `src/routes/+error.svelte` avant d'afficher la page d'erreur par défaut. Si _cette page_ échoue également (ou si l'erreur survient au sein de la fonction `load` du `+layout` racine, qui est "au-dessus" du fichier `+error` racine), SvelteKit sauve les meubles et rend une page d'erreur statique, que vous pouvez personnaliser en créant un fichier `src/error.html`.

Si l'erreur survient dans la fonction `load` d'un `+layout(.server).js`, le fichier d'erreur le plus proche dans l'arbre est un fichier `+error.svelte` _au-dessus_ de ce <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> (et non au même niveau).

Si aucune route n'est trouvée (404), `src/routes/+error.svelte` est affichée (ou la page d'erreur par défaut, si ce fichier n'existe pas).

> `+error.svelte` n'est _pas_ utilisée lorsqu'une erreur survient dans une fonction [`handle`](hooks#hooks-de-serveur-handle) ou un gestionnaire de requête [`+server.js`](#server).

Vous pouvez en apprendre plus sur la gestion des erreurs [ici](errors).

## +layout

Jusqu'ici, nous avons traité les pages comme des composants complètement autonomes — lors de la navigation, le composant `+page.svelte` actuel est détruit, et un autre prend sa place.

Mais dans beaucoup d'applications, certains éléments doivent être visibles sur _chaque_ page, comme la navigation principale ou le footer. Plutôt que de tous les répéter dans chaque `+page.svelte`, nous pouvons les définir dans des <span class="vo">[_layouts_](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>.

### +layout.svelte

Pour créer un <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> qui s'applique à chaque page, créez un fichier avec le nom `src/routes/+layout.svelte`. Le layout par défaut (celui que SvelteKit utilise si vous ne créez pas le votre) ressemble à ça...

```html
<slot></slot>
```
... mais nous pouvons y ajouter n'importe quel <span class="vo">[markup](PUBLIC_SVELTE_SITE_URL/docs/web#markup)</span>, style ou comportement. La seule contrainte est la présence d'un `<slot>` représentant le contenu de la page. Par exemple, ajoutons un barre de navigation :

```html
/// file: src/routes/+layout.svelte
<nav>
	<a href="/">Accueil</a>
	<a href="/about">À propos</a>
	<a href="/settings">Paramètres</a>
</nav>

<slot></slot>
```

Si nous créeons des pages pour `/`, `/about`, et `/settings`...

```html
/// file: src/routes/+page.svelte
<h1>Accueil</h1>
```

```html
/// file: src/routes/about/+page.svelte
<h1>À propos</h1>
```

```html
/// file: src/routes/settings/+page.svelte
<h1>Paramètres</h1>
```

... la barre de navigation sera alors toujours visible, et passer d'une page à l'autre ne remplacera que le `<h1>`.

Les layouts peuvent être _imbriqués_. Supposez que nous ayons plusieurs pages de paramètres – `/settings`, `/settings/profile` et `/settings/notifications` – avec un sous-menu partagé (un exemple est disponible sur [github.com/settings](https://github.com/settings)).

Nous pouvons créer un layout qui s'applique aux pages en-dessous de `/settings` (tout en héritant de la barre de navigation du layout racine) :

```svelte
<!--- file: src/routes/settings/+layout.svelte --->
<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<h1>Paramètres</h1>

<div class="submenu">
	{#each data.sections as section}
		<a href="/settings/{section.slug}">{section.title}</a>
	{/each}
</div>

<slot></slot>
```

Par défaut, chaque layout hérite du layout au-dessus de lui. Mais parfois ce n'est pas ce que l'on souhaite — dans ce cas, la section [layouts avancés](advanced-routing#layouts-avanc-s) peut vous aider.

### +layout.js

De la même manière que `+page.svelte` charge sa donnée de `+page.js`, votre composant `+layout.svelte` peut charger sa donnée dans la fonction [`load`](load) du fichier `+layout.js`.

```js
/// file: src/routes/settings/+layout.js
/** @type {import('./$types').LayoutLoad} */
export function load() {
	return {
		sections: [
			{ slug: 'profile', title: 'Profil' },
			{ slug: 'notifications', title: 'Notification' }
		]
	};
}
```

Si un `+layout.js` exporte des [options de page](page-options) — `prerender`, `ssr` et `csr` — elles seront appliquées par défaut aux pages enfantes.

La donnée renvoyée d'une fonction `load` de layout est aussi accessible dans toutes ses pages enfants :

```svelte
<!--- file: src/routes/settings/profile/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	console.log(data.sections); // [{ slug: 'profile', title: 'Profile' }, ...]
</script>
```

> Souvent, la donnée de layout reste inchangée lors de la navigation entre pages. SvelteKit ré-exécute intelligemment les fonctions [`load`](load) uniquement lorsque nécessaire.

### +layout.server.js

Pour exécuter votre fonction `load` de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> sur le serveur, déplacez la dans `+layout.server.js`, et changez le type `LayoutLoad` en `LayoutServerLoad`.

Comme `+layout.js`, `+layout.server.js` peut exporter des [options de page](page-options) — `prerender`, `ssr` et `csr`.

## +server

En plus des pages, vous pouvez définir des routes à l'aide de fichiers `+server.js` (parfois appelées "routes d'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>" ou "<span class="vo">[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span>"), qui vous donnent un contrôle complet sur votre réponse. Un fichier `+server.js` exporte des fonctions correspondant aux verbes HTTP comme `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`, et `HEAD` qui acceptent un argument `RequestEvent` et renvoie un objet [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response).

Par exemple, nous pouvons créer une route `/api/random-number` avec une fonction `GET` :

```js
/// file: src/routes/api/random-number/+server.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const min = Number(url.searchParams.get('min') ?? '0');
	const max = Number(url.searchParams.get('max') ?? '1');

	const d = max - min;

	if (isNaN(d) || d < 0) {
		error(400, 'min et max doivent être des nombres, et min doit être inférieur à max');
	}

	const random = min + Math.random() * d;

	return new Response(String(random));
}
```

Le premier argument de la `Response` peut être un [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream), rendant possible l'envoi d'une grande quantité de données sous forme de flux, ou la création d'évènements-serveur (sauf si vous déployez sur des plateformes qui envoient les réponses sous forme de <span class="vo">[Buffer](PUBLIC_SVELTE_SITE_URL/docs/web#buffer)</span>, comme AWS Lambda).

Vous pouvez utiliser les méthodes [`error`](modules#sveltejs-kit-error), [`redirect`](modules#sveltejs-kit-redirect) et [`json`](modules#sveltejs-kit-json) de `@sveltejs/kit` pour vous simplifier la vie (mais vous n'en avez pas l'obligation).

Si une erreur survient (soit via `error(...)`, soit une erreur inattendue), la réponse sera la représentation <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span> de l'erreur ou une page d'erreur de secours — qui peut être personnalisée via `src/error.html` — en fonction du <span class="vo">[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `Accept`. Le composant [`+error.svelte`](#error) ne sera _pas_ rendu dans ce cas. Vous pouvez en apprendre plus sur la gestion d'erreurs [ici](errors).

> Lors que vous créez une fonction `OPTIONS`, notez que Vite injectera les headers `Access-Control-Allow-Origin` et `Access-Control-Allow-Methods` — ceux-ci ne sont pas présents en production à moins que vous ne les ajoutiez.

### Recevoir des données

En exportant des fonctions `POST`/`PUT`/`PATCH`/`DELETE`/`OPTIONS`/`HEAD`, les fichiers `+server.js` peuvent être utilisés pour créer une <span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> complète :

```svelte
<!--- file: src/routes/add/+page.svelte --->
<script>
	let a = 0;
	let b = 0;
	let total = 0;

	async function add() {
		const response = await fetch('/api/add', {
			method: 'POST',
			body: JSON.stringify({ a, b }),
			headers: {
				'content-type': 'application/json'
			}
		});

		total = await response.json();
	}
</script>

<input type="number" bind:value={a}> +
<input type="number" bind:value={b}> =
{total}

<button on:click={add}>Calculer</button>
```

```js
/// file: src/routes/api/add/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const { a, b } = await request.json();
	return json(a + b);
}
```

> En général, les [actions de formulaire](form-actions) sont une meilleure façon d'envoyer des données du navigateur vers le serveur.

> Si une fonction `GET` est exportée, une requête `HEAD` renverra le `content-length` du <span class="vo">[body](PUBLIC_SVELTE_SITE_URL/docs/web#body)</span> de la réponse de `GET`.

### Fonction par défaut

Exporter la fonction `fallback` permet de gérer toutes les méthodes HTTP non spécifiées, incluant des méthodes comme `MOVE` qui n'ont pas d'export dédié dans `+server.js`.

```js
// @errors: 7031
/// file: src/routes/api/add/+server.js
import { json, text } from '@sveltejs/kit';

export async function POST({ request }) {
	const { a, b } = await request.json();
	return json(a + b);
}

// Cette fonction gèrera PUT, PATCH, DELETE, etc.
/** @type {import('./$types').RequestHandler} */
export async function fallback({ request }) {
	return text(`J'ai géré votre requête ${request.method} !`);
}
```

> Pour les requêtes `HEAD`, la fonction `GET` est prioritaire sur la fonction `fallback`.

### Négociation de contenu

Les fichiers `+server.js` peuvent être placés dans le même dossier que les fichiers `+page`, permettant à une route d'être à la fois une page ou un <span class="vo">[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> d'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>. Pour les différencier, SvelteKit utilise les règles suivantes :

- les requêtes `PUT`/`PATCH`/`DELETE`/`OPTIONS` sont toujours gérées par `+server.js` puisqu'elles ne concernent pas les pages
- les requêtes `GET`/`POST`/`HEAD` sont traitées comme des requêtes de page si le <span class="vo">[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `accept` priorise `text/html` (en d'autres mots, c'est un navigateur qui demande une page), et sinon gérées par `+server.js`.
- les réponses aux requêtes `GET` incluent un header `Vary: Accept`, de sorte que les <span class="vo">[proxy](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> et les navigateurs mettent en cache séparement les réponses HTML et JSON.

## $types

Dans les exemples précédents, nous avons importé les types d'un fichier `$types.d.ts`. C'est un fichier que SvelteKit crée pour vous dans un dossier caché si vous utilisez TypeScript (ou JavaScript avec les annotations typées JSDoc) pour vous garantir du typage lorsque vous travaillez avec vos fichiers principaux.

Par exemple, annoter `export let data` avec `PageData` (ou `LayoutData`, pour un fichier `+layout.svelte`) dit à TypeScript que le type de `data` est du type de ce que renvoie la fonction `load` :

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>
```

En retour, annoter la fonction `load` avec `PageLoad`, `PageServerLoad`, `LayoutLoad` ou `LayoutServerLoad` (pour `+page.js`, `+page.server.js`, `+layout.js` et `+layout.server.js` respectivement) garantit que les `params` et la valeur de retour sont correctement typées.

Si vous utilisez VS Code ou tout <span class="vo">[IDE](PUBLIC_SVELTE_SITE_URL/docs/development#ide)</span> qui supporte le protocole <span class="vo">[language server](PUBLIC_SVELTE_SITE_URL/docs/development#language-server)</span> ainsi que des <span class="vo">[plugins](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> TypeScript, vous pouvez alors omettre _complètement_ ces types ! L'outillage d'IDE de Svelte ajoutera les bons types à votre place, pour que vous ayez la vérification de types sans avoir à l'écrire vous-même. Cela fonctionne également avec notre outil de ligne de commande `svelte-check`.

Vous pouvez en apprendre plus sur l'omission des `$types` dans cet [article de blog](https://svelte.dev/blog/zero-config-type-safety) (en anglais).

## Autres fichiers

Tout autre fichier présent dans un dossier de route est ignoré par SvelteKit. Cela implique que vous pouvez placer vos composants et utilitaires à côté des routes qui en ont besoin.

Si des composants et utilitaires sont utilisés par plusieurs routes, c'est une bonne idée de les placer dans le dossier [`$lib`](modules#$lib).

## Sur le même sujet

- [Tutoriel: Routing](PUBLIC_LEARN_SITE_URL/tutorial/pages)
- [Tutoriel: Routes d'API](PUBLIC_LEARN_SITE_URL/tutorial/get-handlers)
- [Documentation: Routing avancé](advanced-routing)
