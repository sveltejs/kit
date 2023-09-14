---
title: Charger des données
---

Avant qu'un composant [`+page.svelte`](routing#page-page-svelte) (et son composant [`+layout.svelte`](routing#layout-layout-svelte) qui l'entoure) puisse être rendu, il est souvent nécessaire de récupérer des données. Nous faisons cela avec les fonctions `load`.

## Données de page

Un fichier `+page.svelte` peut avoir un fichier partenaire `+page.js` qui exporte une fonction `load`, dont la valeur de retour est disponible dans la page via la <span class="vo">[prop](PUBLIC_SVELTE_SITE_URL/docs/svelte#props)</span> `data` :

```js
/// file: src/routes/blog/[slug]/+page.js
/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	return {
		post: {
			title: `Le titre de ${params.slug} est défini ici`,
			content: `Le contenu de ${params.slug} est défini ici`
		}
	};
}
```

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>
```

Grâce au module généré `$types`, nous avons accès aux types automatiquement.

Une fonction `load` dans un fichier `+page.js` est exécutée à la fois sur le serveur et dans le navigateur (à moins d'être combinée avec `export const ssr = false`, ce qui la ferait être [uniquement exécutée dans le navigateur](page-options#ssr)). Si votre fonction `load` doit _toujours_ être exécuté sur le serveur (parce qu'elle utilise des variables d'environnement privées, ou a besoin d'accéder à une base de donnée par exemple), elle doit alors être définie dans `+page.server.js`.

Voici une version plus réaliste de la fonction `load` de vos articles de blog, qui est uniquement exécutée sur le serveur et récupère sa donnée dans une base de données :

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPost(slug: string): Promise<{ title: string, content: string }>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	return {
		post: await db.getPost(params.slug)
	};
}
```

Notez que le type a changé de `PageLoad` à `PageServerLoad`, car les fonctions `load` de serveur ont accès à des arguments additionnels. Pour comprendre les cas d'utilisation de `+page.js` et ceux de `+page.server.js`, lire [Universel vs serveur](load#universel-vs-serveur).

## Données de layout

Vos fichiers `+layout.svelte` peuvent aussi charger des données, via `+layout.js` ou `+layout.server.js`.

```js
/// file: src/routes/blog/[slug]/+layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPostSummaries(): Promise<Array<{ title: string, slug: string }>>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').LayoutServerLoad} */
export async function load() {
	return {
		posts: await db.getPostSummaries()
	};
}
```

```svelte
<!--- file: src/routes/blog/[slug]/+layout.svelte --->
<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<main>
	<!-- +page.svelte est affichée ici <slot> -->
	<slot />
</main>

<aside>
	<h2>Plus d'articles</h2>
	<ul>
		{#each data.posts as post}
			<li>
				<a href="/blog/{post.slug}">
					{post.title}
				</a>
			</li>
		{/each}
	</ul>
</aside>
```

Les données renvoyées par les fonctions `load` de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> sont accessibles dans le `+layout.svelte` auquel il "appartient", le composant `+page.svelte`, ainsi que dans les composants `+layout.svelte` enfant.

```diff
/// file: src/routes/blog/[slug]/+page.svelte
<script>
+	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

+	// nous pouvons accéder à `data.posts` car cette donnée est renvoyée
+	// par la fonction `load` du layout parent
+	$: index = data.posts.findIndex(post => post.slug === $page.params.slug);
+	$: next = data.posts[index - 1];
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>

+{#if next}
+	<p>Article suivant : <a href="/blog/{next.slug}">{next.title}</a></p>
+{/if}
```

> Si plusieurs fonctions `load` renvoient des données portant la même clé, la dernière "gagne" — le résultat d'un `load` de layout renvoyant `{ a: 1, b: 2 }` et d'un `load` de page renvoyant `{ b: 3, c: 4 }` serait `{ a: 1, b: 3, c: 4 }`

## $page.data

Le composant `+page.svelte` et tous les composants `+layout.svelte` au-dessus ont accès à leurs propres données en plus de toutes les données de leur parents.

Dans certains cas, nous pourrions avoir besoin de l'opposé — un <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> parent pourrait avoir besoin d'accéder à la donnée de page ou à la donnée d'un layout enfant. Par exemple, le layout racine pourrait avoir besoin d'accéder à la propriété `title` renvoyée par la fonction `load` de `+page.js` ou `+page.server.js`. Ceci est possible grâce à `$page.data` :

```svelte
<!--- file: src/routes/+layout.svelte --->
<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.data.title}</title>
</svelte:head>
```

Le typage de `$page.data` est fourni par `App.PageData`.

## Universel vs serveur

Nous avons vu qu'il existe deux types de fonctions `load` :

* les fichiers `+page.js` et `+layout.js` exportent des fonctions `load` _universelles_ qui s'exécutent à la fois sur le serveur et dans le navigateur
* les fichiers `+page.server.js` et `+layout.server.js` exportent des fonction `load` de _serveur_ qui s'exécutent uniquement sur le serveur

Conceptuellement, elles font la même chose, mais il existe des différences importantes à connaître.

### À quel moment ces fonctions sont exécutées ?

Les fonction `load` de serveur sont _toujours_ exécutées sur le serveur.

Par défaut, les fonctions `load` universelles s'exécutent sur le serveur pendant le [SSR](glossary#ssr) lorsque l'utilisateur ou l'utilisatrice visite la page pour la première fois. Elles sont ensuite de nouveau exécutées lors de l'hydratation, en utilisant les réponses des [requêtes `fetch`](#requ-ter-avec-fetch). Toutes les invocations suivantes de fonctions `load` universelles ont lieu dans le navigateur. Vous pouvez personnaliser ce comportement avec les [options de page](page-options). Si vous [désactivez le rendu côté serveur](page-options#ssr), vous obtiendrez un comportement de <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span>, et les fonctions `load` universelles de la page en question seront _toujours_ exécutées dans le navigateur.

Si une route contient à la fois des fonctions `load` universelles et de serveur, la fonction `load` de serveur est exécutée en premier.

Une fonction `load` est invoquée au moment de l'exécution, sauf en cas de [prérendu](page-options#prerender) de la page - dans ce cas, elle est invoquée au moment de la compilation.

### Paramètres d'entrée

Les fonctions `load` universelles et de serveur ont toutes les deux accès aux propriétés décrivant la requête (`params`, `route`, et `url`) ainsi qu'à diverses fonctions (`fetch`, `setHeaders`, `parent`, `depends` et `untrack`). Celles-ci sont décrités dans les sections suivantes.

Les fonctions `load` de serveur sont appelées avec un évènement `ServerLoadEvent`, qui hérite de `clientAddress`, `cookies`, `locals`, `platform`, et `request` de `RequestEvent`.

Les fonctions `load` universelles sont appelées avec un évènement `LoadEvent`, qui a une propriété `data`. Si vous avez des fonctions `load` à la fois dans `+page.js` et `+page.server.js` (ou `+layout.js` et `+layout.server.js`), la valeur de retour de la fonction `load` de serveur est la propriété `data` dans l'argument de la fonction `load` universelle.

### Paramètres de sortie

Une fonction `load` universelle peut renvoyer un objet contenant n'importe quelles valeurs, même des choses comme des classes personnalisée et des constructeurs de composant.

Une fonction `load` de serveur doit renvoyer des données pouvant être sérialisées avec [devalue](https://github.com/rich-harris/devalue) — tout ce qui être représenté en <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span> plus des choses comme `BigInt`, `Date`, `Map`, `Set` et `RegExp`, ou des références cycliques — afin qu'elle soit transportée sur le réseau. Votre donnée peut inclure des [promesses](#le-flux-des-promesses), dont les valeurs promises seront envoyées en flux aux navigateurs.

### Quand utiliser quoi

Les fonctions `load` de serveur sont pratiques lorsque vous avez besoin d'accéder à la donnée directement depuis une base de données ou un système de fichiers, ou lorsque vous avez besoin d'utiliser des variables d'environnement privées.

Les fonctions `load` universelles sont utiles lorsque vous avez besoin de récupérer avec `fetch` des données d'une <span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> externe et n'avez pas besoin d'identifiants privés, puisque SvelteKit peut récupérer la donnée directement depuis l'API plutôt que de faire un aller-retour vers votre serveur. Elles sont également utiles lorsque vous avez besoin de renvoyer quelque chose qui ne peut pas être sérialisé, comme un constructeur de composant Svelte.

Dans de rares cas, vous pourriez avoir besoin d'utiliser les deux ensemble – par exemple, vous pourriez avoir besoin de renvoyer une instance d'une classe personnalisée qui a été initialisée avec des données venant de votre serveur. Lorsque vous utilisez les deux ensemble, la valeur de retour de la fonction `load` de serveur n'est _pas_ passée directement à la page, mais à la fonction `load` universelle (comme la propriété `data`) :

```js
/// file: src/routes/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		serverMessage: 'bonjour depuis la fonction load de serveur'
	};
}
```

```js
/// file: src/routes/+page.js
// @errors: 18047
/** @type {import('./$types').PageLoad} */
export async function load({ data }) {
	return {
		serverMessage: data.serverMessage,
		universalMessage: 'bonjour depuis la fonction load universelle'
	};
}
```

## Utiliser la donnée d'URL

Souvent, la fonction `load` dépend de l'URL d'une manière ou d'une autre. Pour cela, la fonction `load` fournit `url`, `route` et `params`.

### `url`

Une instance d'[`URL`](https://developer.mozilla.org/fr/docs/Web/API/URL), contenant des propriétés telles que `origin`, `hostname`, `pathname` et `searchParams` (qui contient la chaîne de caractères de recherche <span class="vo">[parsée](PUBLIC_SVELTE_SITE_URL/docs/development#parser)</span> en objet [`URLSearchParams`](https://developer.mozilla.org/fr/docs/Web/API/URLSearchParams)). `url.hash` ne peut pas être utilisée pendant `load`, car elle n'est pas disponible sur le serveur.

> Dans certains environnements, cette URL est dérivée des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> de requête pendant le rendu côté serveur. Si vous utilisez l'[adaptateur pour Node](adapter-node) par exemple, vous pourriez avoir besoin de configurer l'adaptateur pour que l'URL soit correcte.

### `route`

Contient le nom du dossier de la route actuelle, relativement à `src/routes` :

```js
/// file: src/routes/a/[b]/[...c]/+page.js
/** @type {import('./$types').PageLoad} */
export function load({ route }) {
	console.log(route.id); // '/a/[b]/[...c]'
}
```

### `params`

`params` est dérivé de `url.pathname` et `route.id`.

Si on suppose une `route.id` étant `/a/[b]/[...c]` et un `url.pathname` étant `/a/x/y/z`, l'objet `params` ressemblerait à ça :

```json
{
	"b": "x",
	"c": "y/z"
}
```

## Requêter avec `fetch`

Pour obtenir des données d'une <span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> externe ou d'une fonction de `+server.js`, vous pouvez utiliser la fonction `fetch` fournie, qui fonctionne exactement comme l'[API web `fetch` native](https://developer.mozilla.org/fr/docs/Web/API/fetch) avec quelques fonctionnalités supplémentaires :

- Elle peut être utilisée pour faire des requêtes authentifiées sur le serveur, puisqu'elle hérite des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `cookie` et `authorization` pour la requête de page.
- Elle peut faire des requêtes relatives sur le serveur (ordinairement, `fetch` nécessite une URL avec une origine lorsqu'utilisée dans un contexte serveur).
- Les requêtes internes (i.e. vers les routes `+server.js`) exécutent directement la fonction concernée lorsqu'émises depuis le serveur, sans appel HTTP supplémentaire.
- Pendant le rendu côté serveur, la réponse sera capturée et <span class="vo">[inlinée](PUBLIC_SVELTE_SITE_URL/docs/javascript#inline)</span> dans le HTML construit en utilisant les méthodes `text`, `json` et `arrayBuffer` de l'objet `Response`. Notez que les headers ne sont _pas_ sérialisés, à moins d'avoir explicitement utilisé [`filterSerializedResponseHeaders`](hooks#hooks-de-serveur-handle).
- Pendant l'hydratation, la réponse sera lue depuis le HTML, garantissant la consistance et évitant ainsi une requête réseau additionnelle — si vous recevez un avertissement dans votre console de navigateur après avoir utilisé `fetch` plutôt que le `fetch` de `load`, c'est la raison.

```js
/// file: src/routes/items/[id]/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
	const res = await fetch(`/api/items/${params.id}`);
	const item = await res.json();

	return { item };
}
```

## Cookies

Une fonction `load` de serveur peut récupérer et définir des [`cookies`](types#public-types-cookies).

```js
/// file: src/routes/+layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getUser(sessionid: string | undefined): Promise<{ name: string, avatar: string }>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ cookies }) {
	const sessionid = cookies.get('sessionid');

	return {
		user: await db.getUser(sessionid)
	};
}
```

Les cookies seront seulement passés au travers de la fonction `fetch` fournie si l'hôte cible est le même que celui de l'application SvelteKit ou un sous-domaine spécifique de celui-ci.

Par exemple, si SvelteKit sert le domaine my.domain.com :
- domain.com NE RECEVRA PAS les cookies
- my.domain.com RECEVRA les cookies
- api.domain.com NE RECEVRA PAS les cookies
- sub.my.domain.com RECEVRA les cookies

Les autres cookies ne seront pas passés lorsque `credentials: 'include'` est défini, parce que SvelteKit ne sait pas à quel domaine appartient tel ou tel cookie (le navigateur ne transmet pas cette information), il n'est donc pas sécurisé de les transférer. Vous pouvez contourner ce problème en utilisant le [hook handleFetch](hooks#hooks-de-serveur-handlefetch).

## Headers

Les fonctions `load` universelles et de serveur ont toutes les deux accès à une fonction `setHeaders` qui, lorsqu'exécutée sur le serveur, peut définir les <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> de réponse. (Lorsque exécutée dans le navigateur, `setHeaders` n'a pas d'effet.) Cela est utile si vous voulez mettre la page en cache, par exemple :

```js
// @errors: 2322 1360
/// file: src/routes/products/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, setHeaders }) {
	const url = `https://cms.example.com/products.json`;
	const response = await fetch(url);

	// met la page en cache pour la même durée
	// que la donnée sous-jacente
	setHeaders({
		age: response.headers.get('age'),
		'cache-control': response.headers.get('cache-control')
	});

	return response.json();
}
```

Définir le même header plusieurs fois (même dans des fonctions `load` séparées) est une erreur — vous pouvez uniquement définir un header spécifique une seule fois. Vous ne pouvez pas ajouter un header `set-cookie` avec `setHeaders` — utilisez plutôt `cookies.set(name, value, options)`.

## Utiliser la donnée du parent

Il est occasionnellement utile qu'une fonction `load` accède à la donnée d'une fonction `load` parent, ce qui est possible avec `await parent()` :

```js
/// file: src/routes/+layout.js
/** @type {import('./$types').LayoutLoad} */
export function load() {
	return { a: 1 };
}
```

```js
/// file: src/routes/abc/+layout.js
/** @type {import('./$types').LayoutLoad} */
export async function load({ parent }) {
	const { a } = await parent();
	return { b: a + 1 };
}
```

```js
/// file: src/routes/abc/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const { a, b } = await parent();
	return { c: a + b };
}
```

```svelte
<!--- file: src/routes/abc/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<!-- renders `1 + 2 = 3` -->
<p>{data.a} + {data.b} = {data.c}</p>
```

> Notez que la fonction `load` de `+page.js` reçoit la donnée fusionnée des deux fonctions `load` de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>, pas juste celle du parent immédiat.

Dans `+page.server.js` et `+layout.server.js`, `parent` renvoie la donnée des fichiers `+layout.server.js` parents.

Dans `+page.js` ou `+layout.js`, il renverra la donnée des fichiers `+layout.js` parents. En revanche, un fichier `+layout.js` manquant est considéré comme une fonction `({ data }) => data`, ce qui implique qu'il renverra aussi la donnée des fichiers `+layout.server.js` qui ne sont pas "cachés" par un fichier `+layout.js`.

Faites attention à ne pas introduire de cascades de chargement lorsque vous utilisez `await parent()`. Ici par exemple, `getData(params)` ne dépend pas du résultat de l'appel `parent()`, nous devrions donc l'appeler en premier pour éviter de retarder le rendu.

```diff
/// file: +page.js
/** @type {import('./$types').PageLoad} */
export async function load({ params, parent }) {
-	const parentData = await parent();
	const data = await getData(params);
+	const parentData = await parent();

	return {
		...data
		meta: { ...parentData.meta, ...data.meta }
	};
}
```

## Erreurs

Si une erreur se produit pendant `load`, le composant [`+error.svelte`](routing#error) le plus proche est rendu. Pour gérer les [erreurs _attendues_](/docs/errors#erreurs-attendues), utilisez l'utilitaire `error` de `@sveltejs/kit` pour préciser le code HTTP ainsi qu'un message optionnel :

```js
/// file: src/routes/admin/+layout.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user?: {
			name: string;
			isAdmin: boolean;
		}
	}
}

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		error(401, 'pas connecté');
	}

	if (!locals.user.isAdmin) {
		error(403, 'pas administrateur');
	}
}
```

Appeler `error(...)` va lever une exception ; cela permet d'arrêter facilement l'exécution depuis une fonction utilitaire.

Si une [erreur _inattendue_](hooks#hooks-partag-s-handleerror) se produit, SvelteKit invoquera la fonction [`handleError`](hooks#hooks-partag-s-handleerror) et traitera l'erreur comme une 500 Internal Error.

> [Avec SvelteKit 1.x](migrating-to-sveltekit-2#les-retours-des-fonctions-redirect-et-error-ne-doivent-plus-tre-lev-s-explicitement), vous deviez lever une exception avec le retour de la méthode `error` vous-même.

## Redirections

Pour rediriger les visites, utilisez l'utilitaire `redirect` de `@sveltejs/kit` pour préciser l'adresse de redirection ainsi qu'un code `3xx`. Comme `error(...)`, appeler `redirect(...)` va lever une exception, ce qui permet d'arrêter facilement l'exécution depuis une fonction utilitaire.

```js
/// file: src/routes/user/+layout.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user?: {
			name: string;
		}
	}
}

// @filename: index.js
// ---cut---
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		redirect(307, '/login');
	}
}
```

> N'utilisez pas `redirect()` à l'intérieur d'un bloc `try`-`catch`, car la redirection déclenchera le bloc `catch` immédiatement.

Dans le navigateur, vous pouvez aussi naviguer programmatiquement en dehors d'une fonction `load` en utilisant [`goto`](modules#$app-navigation-goto) de [`$app.navigation`](modules#$app-navigation).

> [Avec SvelteKit 1.x](migrating-to-sveltekit-2#les-retours-des-fonctions-redirect-et-error-ne-doivent-plus-tre-lev-s-explicitement), vous deviez lever une exception avec le retour de la méthode `redirect` vous-même.

## Le flux des promesses

Lors de l'exécution d'une fonction `load` de serveur, les promesses seront envoyées en flux ("<span class="vo">[streamées](PUBLIC_SVELTE_SITE_URL/docs/web#stream)</span>") vers le navigateur à leur résolution. Cela est utile si vous avez des données lourdes et non essentielles, car vous pouvez commencer à afficher la page avant que toute la donnée soit disponible :

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare global {
	const loadPost: (slug: string) => Promise<{ title: string, content: string }>;
	const loadComments: (slug: string) => Promise<{ content: string }>;
}

export {};

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	return {
		// make sure the `await` happens at the end, otherwise we
		// can't start loading comments until we've loaded the post
		comments: loadComments(params.slug),
		post: await loadPost(params.slug)
	};
}
```

Cela peut servir pour créer des affichages spécifiques de chargement, par exemple :

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>

{#await data.comments}
	Chargement des commentaires...
{:then comments}
	{#each comments as comment}
		<p>{comment.content}</p>
	{/each}
{:catch error}
	<p>Erreur lors du chargement des commentaires : {error.message}</p>
{/await}
```

Lorsque vous renvoyez des données à travers des promesses, assurez-vous de gérer les exceptions correctement. Plus précisément, le serveur pourrait planter avec une erreur "unhandled promise rejection" si une promesse échoue avant que le rendu ne commence (à ce moment-là, elle est attrapée) et que le serveur ne gère pas l'exception d'une manière ou d'une autre. Si vous utilisez `fetch` de SvelteKit directement dans la fonction `load`, SvelteKit gérera ce cas pour vous. Pour les autres promesses, il suffit d'attacher un argument de gestion des exceptions `catch` vide à la promesse pour la marquer comme gérée :

```js
/// file: src/routes/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export function load({ fetch }) {
	const ok_manual = Promise.reject();
	ok_manual.catch(() => {});

	return {
		ok_manual,
		ok_fetch: fetch('/fetch/that/could/fail'),
		dangerous_unhandled: Promise.reject()
	};
}
```

> Sur les plateformes qui ne proposent pas le <span class="vo">[streaming](PUBLIC_SVELTE_SITE_URL/docs/web#stream)</span> de données, comme AWS Lambda ou Firebase, les réponses seront mises en mémoire tampon. Cela signifie que la page ne sera rendue que lorsque toutes les promesses seront résolues. Si vous utilisez un <span class="vo">[proxy](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> (i.e. NGINX), vérifiez bien qu'il ne mette pas les réponses de votre serveur en mémoire tampon.

> Le <span class="vo">[streaming](PUBLIC_SVELTE_SITE_URL/docs/web#stream)</span> de données ne fonctionne que lorsque JavaScript est disponible. Essayez d'éviter de renvoyer des promesses d'une fonction `load` universelle si la page est rendue côté serveur, car celles-ci ne seront _pas_ streamées — à la place, la promesse est recréée lorsque la fonction est réexécutée dans le navigateur.

> Les <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> et statut d'une réponse ne peuvent pas être changés une fois que la réponse a commencer à être <span class="vo">[streamée](PUBLIC_SVELTE_SITE_URL/docs/web#stream)</span>, vous ne pouvez donc pas utiliser `setHeaders` ou faire de redirections à l'intérieur d'une promesse streamée.

> [Avec SvelteKit 1.x](migrating-to-sveltekit-2#les-promesses-de-premier-niveau-ne-sont-plus-attendues) les promesses de premier niveau étaient automatiquement attendues, tandis que les promesses imbriquées étaient asynchrones.

## Chargement parallèle

Lorsque qu'il rend (ou qu'il navigue vers) une page, SvelteKit exécute toutes les fonctions `load` en parallèle, en évitant une cascade de requêtes. Pendant la navigation côté client, le résultat des appels de `load` serveur multiples sont groupés dans une seule et même réponse. Une fois toutes les fonctions `load` terminées, la page est rendue.

## Rejouer les fonctions `load`

SvelteKit garde en mémoire les dépendances de chaque fonction `load` afin d'éviter de les exécuter inutilement pendant la navigation.

Par exemple, étant donnée une paire de fonctions `load` comme celles-ci...

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPost(slug: string): Promise<{ title: string, content: string }>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	return {
		post: await db.getPost(params.slug)
	};
}
```

```js
/// file: src/routes/blog/[slug]/+layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPostSummaries(): Promise<Array<{ title: string, slug: string }>>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').LayoutServerLoad} */
export async function load() {
	return {
		posts: await db.getPostSummaries()
	};
}
```

...celle de `+page.server.js` sera réexécutée si nous naviguons de `/blog/trying-the-raw-meat-diet` à `/blog/i-regret-my-choices` parce que `params.slug` a changé. Celle de `+layout.server.js` ne sera pas réexécutée, car sa donnée est toujours valide. En d'autres mots, `db.getPostSummaries()` ne sera pas appelée une deuxième fois.

Une fonction `load` qui appelle `await parent()` sera toujours réexécutée si une fonction `load` parente est réexécutée.

Le suivi de dépendances ne s'applique pas _après_ que la fonction `load` ait fini son exécution — par exemple, accéder à `params.x` dans une [promesse imbriquée](#le-flux-des-promesses) ne déclenchera la réexécution de la fonction lorsque `params.x` change. (Ne vous inquiétez pas, vous aurez un avertissement en développement si vous faites ça accidentellement.) Accédez plutôt aux paramètres dans le corps principal de vos fonctions `load`.

Les paramètres de recherche sont suivis de manière indépendante du reste de l'URL. Par exemple, faire appel à `event.url.searchParams.get("x")` dans une fonction `load` aura pour conséquence que cette fonction `load` soit réexécutée lors d'une navigation depuis `?x=1` vers `?x=2`, mais pas lors d'une navigation depuis `?x=1&y=1` vers `?x=1&y=2`.

### Bloquer le suivi de dépendances

Dans de rares cas, vous pourriez vouloir exclure quelque chose du mécanisme de suivi de dépendances. Vous pouvez faire cela avec la fonction `untrack` :


```js
/// file: src/routes/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ untrack, url }) {
	// Bloque url.pathname afin qu'un changement de path ne déclenche pas le chargement des données
	if (untrack(() => url.pathname === '/')) {
		return { message: 'Welcome!' };
	}
}
```

### Invalidation manuelle

Vous pouvez aussi rejouer les fonctions `load` qui s'appliquent à la page actuelle en utilisant [`invalidate(url)`](modules#$app-navigation-invalidate), qui rejoue toutes les fonctions `load` qui dépendent de `url`, et [`invalidateAll()`](modules#$app-navigation-invalidateall), qui rejoue toutes les fonctions `load`. Les fonctions `load` de serveur ne seront jamais automatiquement dépendantes d'une `url` requêtée pour éviter de dévoiler des données sensibles au client.

Une fonction `load` dépend de `url` si elle appelle `fetch(url)` ou `depends(url)`. Notez que `url` peut être un identifiant personnalisé commençant par `[a-z]:` :

```js
/// file: src/routes/random-number/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, depends }) {
	// `load` est rejouée quand `invalidate('https://api.example.com/random-number')` est appelée...
	const response = await fetch('https://api.example.com/random-number');

	// ...ou quand `invalidate('app:random')` est appelée
	depends('app:random');

	return {
		number: await response.json()
	};
}
```

```svelte
<!--- file: src/routes/random-number/+page.svelte --->
<script>
	import { invalidate, invalidateAll } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	function rerunLoadFunction() {
		// tous ces appels vont rejouer la fonction `load`
		invalidate('app:random');
		invalidate('https://api.example.com/random-number');
		invalidate(url => url.href.includes('random-number'));
		invalidateAll();
	}
</script>

<p>nombre aléatoire: {data.number}</p>
<button on:click={rerunLoadFunction}>Mettre à jour le nombre</button>
```

### À quel moment sont rejouées les fonctions `load` ?

Pour résumer, une fonction `load` sera rejouée dans les situations suivantes :

- Elle référence une propriété de `params` dont la valeur a changé
- Elle référence une propriété de l'`url` (comme `url.pathname` ou `url.search`) dont la valeur a changé. Les propriétés de `request.url` ne sont _pas_ prises en compte
- Elle appelle `url.searchParams.get(...)`, `url.searchParams.getAll(...)` ou `url.searchParams.has(...)` et le paramètre en question change. Accéder aux autre propriétés de `url.searchParams` aura le même effet qu'accéder à `url.search`
- Elle appelle `await parent()` et une fonction `load` parente a été rejouée
- Elle déclare une dépendance à une URL spécifique via [`fetch`](#requ-ter-avec-fetch) (fonctions universelles seulement) ou [`depends`](types#public-types-loadevent), et cette URL a été déclarée invalide avec [`invalidate(url)`](modules#$app-navigation-invalidate)
- Toutes les fonctions `load` actives ont été rejouées de force avec [`invalidateAll()`](modules#$app-navigation-invalidateall)

`params` et `url` peuvent changer en réponse à un clic sur un lien `<a href="..">`, une [interaction sur un `<form>`](form-actions#get-vs-post), une invocation de [`goto`](modules#$app-navigation-goto), ou un [`redirect`](modules#sveltejs-kit-redirect).

Notez que rejouer une fonction `load` va mettre à jour la <span class="vo">[prop](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#props)</span> `data` dans le composant `+layout.svelte` ou `+page.svelte` correspondant ; cela n'implique _pas_ la réinstantiation du composant. En conséquence, l'état interne du composant est préservé. Si ce n'est pas le comportement que vous recherchez, vous pouvez réinitialiser ce dont vous avez besoin dans [`afterNavigate`](modules#$app-navigation-afternavigate), et/ou entourer votre composant d'un bloc [`{#key ...}`](https://svelte.dev/docs#template-syntax-key).

## Implications pour l'authentification

Certaines caractéristiques du chargement des données ont des implications importantes pour les contrôles d'authentification :
- Les fonctions `load` des layouts ne sont pas jouées à chaque requête, en particulier lors de navigation côté client entre pages enfants. [(Quand est-ce qu'une fonction load est réexécutée ?)](load#rejouer-les-fonctions-load)
- les fonctions `load` des pages et des layouts sont jouées en parallèle à moins que `await parent()` n'ait été appelé. Si un layout lève une exception pendant le `load`, la fonction `load` de la page est **exécutée** mais le client ne recevra pas les données.

Il y a plusieurs stratégies possibles pour s'assurer qu'une vérification soit appelée avec que du code protégé ne soit atteint :

Pour éviter le chargement de données et préserver le client de la mise en cache des fonctions `load` des layouts :
- Utiliser [hooks](hooks) pour protéger plusieurs routes avant l'exécution de toute fonction `load`.
- Utiliser des fonctions de vérification de droits directement dans les fonctions `+page.server.js` `load` pour une protection spécifique de la route.

## Sur le même sujet

- [Tutoriel: Chargement de données](PUBLIC_LEARN_SITE_URL/tutorial/page-data)
- [Tutoriel: Erreurs et redirections](PUBLIC_LEARN_SITE_URL/tutorial/error-basics)
- [Tutoriel: Chargement avancé](PUBLIC_LEARN_SITE_URL/tutorial/await-parent)
