---
title: Gestion d'état
---

Si vous êtes habitué•e•s à construire des applications pur-client, la gestion d'état dans une application qui couvre un serveur et un client peut sembler intimidante. Cette section fournit des astuces pour vous permettre d'éviter certains problèmes classiques.

## Éviter les états partagés sur le serveur

Les navigateurs _gèrent des états_ nativement — l'état est stocké en mémoire au fur et à mesure que l'utilisateur ou l'utilisatrice interagit avec l'application. En revanche, les serveurs _ne gèrent pas d'état_ — le contenu de la réponse est déterminé entièrement par le contenu de la requête.

C'est un état de fait théorique. En réalité, les serveurs sont souvent en service pendant de longues durées et sont partagés entre plusieurs utilisateurs. Pour cette raison il est important de ne pas y stocker de données dans des variables partagées. Par exemple, prenons ce code :

```js
// @errors: 7034 7005
/// file: +page.server.js
let user;

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return { user };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		// NE FAITES JAMAIS ÇA !
		user = {
			name: data.get('name'),
			embarrassingSecret: data.get('secret')
		};
	}
}
```

La variable `user` est partagée à toute personne se connectant à ce serveur. Si Alice a soumis un secret gênant, et Bob visite la page juste après elle, Bob a alors accès au secret d'Alice. De plus, lorsqu'Alice revient sur le site un peu plus tard, le serveur peut s'être relancé, lui faisant perdre sa donnée.

À la place, vous devriez _authentifier_ l'utilisateur ou l'utilisatrice en utilisant des [`cookies`](load#cookies) et persister la donnée dans une base de données.

## Pas d'effets de bord dans les fonctions `load`

Pour la même raison, vos fonctions `load` doivent être _pures_ — sans aucun effet de bord (à l'exception éventuellement d'un `console.log(...)` ponctuel). Par exemple, vous pourriez être tenté•e d'écrire dans un <span class="vo">[store](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#store)</span> au sein d'une fonction `load` afin de réutiliser la valeur de ce store dans vos composants :

```js
/// file: +page.js
// @filename: ambient.d.ts
declare module '$lib/user' {
	export const user: { set: (value: any) => void };
}

// @filename: index.js
// ---cut---
import { user } from '$lib/user';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/api/user');

	// NE FAITES JAMAIS ÇA !
	user.set(await response.json());
}
```

Comme dans l'exemple précédent, ceci place la donnée de l'utilisateur dans un endroit qui est partagée à _toute personne_ se rendant sur le site. À la place, contentez-vous de renvoyer la donnée...

```diff
/// file: +page.js
export async function load({ fetch }) {
	const response = await fetch('/api/user');

+	return {
+		user: await response.json()
+	};
}
```

...et passez-la alors à vos composants qui en ont besoin, ou utilisez [`$page.data`](load#$page-data).

Si vous n'utilisez pas le <span class="vo">[SSR](PUBLIC_SVELTE_SITE_URL/docs/web#server-side-rendering)</span>, vous ne prenez pas le risque d'exposer accidentellement la donnée à quelqu'un d'autre. Mais vous devriez tout de même éviter les effets de bord dans vos fonctions `load` — votre application sera alors bien plus simple à maintenir.

## Utiliser les stores avec du contexte

Vous vous demandez peut-être comment nous pouvons utiliser `$page.data` et d'autres [stores de page](modules#$app-stores) si nous ne pouvons pas utiliser nos propres stores. La réponse est que les <span class="vo">[stores](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#store)</span> d'application utilisent sur le serveur l'[API de contexte](PUBLIC_LEARN_SITE_URL/tutorial/context-api) de Svelte — le store est attaché à l'arbre de composant avec `setContext`, et lorsque vous vous y abonnez, vous le récupérez avec `getContext`. Nous pouvons faire la même chose avec nos propres stores :

```svelte
<!--- file: src/routes/+layout.svelte --->
<script>
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	/** @type {import('./$types').LayoutData} */
	export let data;

	// Crée un store et le met à jour lorsque nécessaire...
	const user = writable();
	$: user.set(data.user);

	// ...et l'ajoute au contexte pour que les composants enfants puissent y accéder
	setContext('user', user);
</script>
```

```svelte
<!--- file: src/routes/user/+page.svelte --->
<script>
	import { getContext } from 'svelte';

	// Récupère le store user depuis le contexte
	const user = getContext('user');
</script>

<p>Bienvenue {$user.name}</p>
```

Mettre à jour la valeur d'un store de contexte dans des pages ou composants plus profonds pendant le rendu de la page via [SSR](glossary#ssr) ne mettra pas à jour la valeur dans un composant parent parcequ'il aura déjà été rendu au moment ou la valeur du store est mise à jour. En revanche, côté client (lorsque le [CSR](glossary#csr) est activé, ce qui est le cas par défaut), la valeur sera propagée et les composants, pages et layouts parents seont mis à jours avec la nouvelle valeur. C'est pourquoi, pour éviter que les valeurs "clignotent" pendant les mises à jour d'état lors de l'hydratation, il est en général recommandé de faire descendre l'état vers les composants plutôt que de le faire remonter.

Si vous n'utilisez pas le <span class="vo">[SSR](PUBLIC_SVELTE_SITE_URL/docs/web#server-side-rendering)</span> (et pouvez garantir que vous n'aurez pas besoin d'utiliser le SSR dans le futur), vous pouvez alors garder votre état en toute sécurité dans un module partagé, sans avoir besoin de l'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> de contexte.

## L'état du composant et l'état de la page sont préservés

Lorsque vous naviguez dans votre application, SvelteKit réutilise les composants de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> et de page. Par exemple, si vous avez une route comme celle-ci...

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	// CE CODE EST BUGGUÉ !
	const wordCount = data.content.split(' ').length;
	const estimatedReadingTime = wordCount / 250;
</script>

<header>
	<h1>{data.title}</h1>
	<p>Temps de lecture : {Math.round(estimatedReadingTime)} minutes</p>
</header>

<div>{@html data.content}</div>
```

...alors naviguer depuis `/blog/my-short-post` vers `/blog/my-long-post` ne va pas déclencher la destruction et regénération du layout, de la page ni d'aucun composant de la page. A la place, la <span class="vo">[prop](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#prop)</span> `data` (et par extension `data.title` and `data.content`) vont changer (comme ce serait le cas pour n'importe quel composant Svelte), mais parce que le code n'est pas réexécuté, les méthodes de cycle de vie `onMount` et `onDestroy` ne seront pas rejouées et `estimatedReadingTime` ne sera pas recalculé.

Pour régler ce problème, nous devons rendre cette valeur [_réactive_](PUBLIC_LEARN_SITE_URL/tutorial/reactive-assignments) :

```diff
/// file: src/routes/blog/[slug]/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;

+	$: wordCount = data.content.split(' ').length;
+	$: estimatedReadingTime = wordCount / 250;
</script>
```

> Si le code dans `onMount` et `onDestroy` doit être exécuté à chaque navigation, vous pouvez utiliser [afterNavigate](modules#$app-navigation-afternavigate) et [beforeNavigate](modules#$app-navigation-beforenavigate) respectivement.

Réutiliser des composants de cette manière signifie que des choses comme l'état des barres de défilement sont préservés, et vous pouvez alors facilement créer des animations entre les différentes valeurs. Dans le cas ou vous auriez besoin de complètement détruire et reconstruire votre composant à chaque navigation, vous pouvez utiliser cette méthode :

```svelte
{#key $page.url.pathname}
	<BlogPost title={data.title} content={data.title} />
{/key}
```

## Stocker l'état dans l'URL

Si vous avez un état qui a besoin de survivre à un rechargement et/ou d'affecter le <span class="vo">[SSR](PUBLIC_SVELTE_SITE_URL/docs/web#server-side-rendering)</span>, comme des filtres ou des règles de tri sur un tableau, les paramètres de recherche de l'URL (comme `?sort=price&order=ascending`) sont un emplacement idéal pour le stocker. Vous pouvez les préciser dans les attributs d'un `<a href="...">` ou d'un `<form action="...">`, ou les définir programmatiquement via `goto('?key=value')`. Ces états sont alors accessibles dans les fonctions `load` via le paramètre `url`, et dans les composants via `$page.url.searchParams`.

## Stocker un état éphémère dans des snapshots

Certains états d'interface, comme "est-ce que cette liste est ouverte ?", sont jetables — si l'utilisateur ou l'utilisatrice navigue sur une autre page ou rafraîchit la page, ce n'est pas grave de perdre ces états. Dans certains cas, vous aurez _besoin_ de persister cette donnée, mais stocker ce genre d'état dans l'URL ou dans une base de données n'est pas approprié. Dans ces cas-là, SvelteKit fournit des [snapshots](snapshots), qui vous permettent d'associer l'état des composants avec une entrée dans l'historique de navigation.

