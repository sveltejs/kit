---
title: Actions de formulaire
---

Un fichier `+page.server.js` peut exporter des _actions_, qui vous permettent d'envoyer avec `POST` des données au serveur en utilisant l'élément `<form>`.

Lorsque vous utilisez un formulaire natif `<form>`, l'envoi du formulaire est réalisé sans JavaScript, rendant JavaScript complètement facultatif sur la page, mais vous pouvez _améliorer progressivement_ les interactions du formulaire de manière simple avec JavaScript pour proposer une meilleure expérience utilisateur (plus d'infos dans [cette section](form-actions#am-lioration-progressive)).

## Actions par défaut

Dans le cas le plus simple, une page déclare une action `default` :

```js
/// file: src/routes/login/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		// TODO connecter l'utilisateur
	}
};
```

Pour invoquer cette action depuis la page `/login`, ajoutez simplement un `<form>` — vous n'avez pas besoin de JavaScript :

```svelte
<!--- file: src/routes/login/+page.svelte --->
<form method="POST">
	<label>
		Email
		<input name="email" type="email">
	</label>
	<label>
		Mot de passe
		<input name="password" type="password">
	</label>
	<button>Connexion</button>
</form>
```

Si quelqu'un clique sur le bouton, le navigateur enverra au serveur la donnée du formulaire via une requête `POST`, déclenchant l'action par défaut.

> Les actions utilisent toujours des requêtes `POST`, puisque les requêtes `GET` ne sont pas censées avoir d'effets de bord.

Nous pouvons aussi invoquer l'action depuis d'autres pages (par exemple s'il y a un bouton de connexion dans la barre de navigation du <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine) en ajoutant l'attribut `action` qui pointe vers la page :

```html
/// file: src/routes/+layout.svelte
<form method="POST" action="/login">
	<!-- contenu -->
</form>
```

## Actions nommées

À la place d'une action `default`, une page peut avoir autant d'actions nommées que nécessaire :

```diff
/// file: src/routes/login/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
-	default: async (event) => {
+	login: async (event) => {
		// TODO connecter l'utilisateur
	},
+	register: async (event) => {
+		// TODO inscrire l'utilisateur
+	}
};
```

Pour invoquer une action nommée, ajouter un paramètre de requête dont le nom est préfixé par un `/` :

```svelte
<!--- file: src/routes/login/+page.svelte --->
<form method="POST" action="?/register">
```

```svelte
<!--- file: src/routes/+layout.svelte --->
<form method="POST" action="/login?/register">
```

Comme pour l'attribut `action`, nous pouvons utiliser l'attribut `formaction` sur le bouton pour envoyer avec `POST` la même donnée de formulaire à une action différente de celle du `<form>` originel :

```diff
/// file: src/routes/login/+page.svelte
-<form method="POST">
+<form method="POST" action="?/login">
	<label>
		Email
		<input name="email" type="email">
	</label>
	<label>
		Mot de passe
		<input name="password" type="password">
	</label>
	<button>Connexion</button>
+	<button formaction="?/register">Inscription</button>
</form>
```

> Nous ne pouvons pas avoir une action par défaut en même temps que des actions nommées, car si vous envoyez avec `POST` à une action nommée sans redirection, le paramètre de recherche est persisté dans l'URL, ce qui signifie que la prochaine requête `POST` par défaut repasserait par la même action nommée que précédemment.

## Anatomie d'une action

Chaque action reçoit un objet `RequestEvent`, vous permettant de lire la donnée avec `request.formData()`. Après avoir traité la requête (par exemple, en connectant l'utilisateur grâce à un cookie), l'action peut répondre avec des données qui seront disponibles au travers de la propriété `form` dans la page correspondante, et à travers `$page.form` dans toute l'application jusqu'à la prochaine mise à jour.

```js
// @errors: 2304
/// file: src/routes/login/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const user = await db.getUserFromSession(cookies.get('sessionid'));
	return { user };
}

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		cookies.set('sessionid', await db.createSession(user), { path: '/' });

		return { success: true };
	},
	register: async (event) => {
		// TODO inscrire l'utilisateur
	}
};
```

```svelte
<!--- file: src/routes/login/+page.svelte --->
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

{#if form?.success}
	<!-- ce message est ephémère ; il existe parce que la page a été rendue en
        réponse à la soumission du formulaire. il disparaîtra si l'utilisateur recharge la page -->
	<p>Vous êtes bien connecté•e ! Ravi de vous revoir, {data.user.name}</p>
{/if}
```

### Erreurs de validation

Si la requête n'a pas pu être traitée à cause de données invalides, vous pouvez renvoyer des erreurs de validation — en plus des valeurs du formulaire reçues — à l'utilisateur ou l'utilisatrice pour qu'elle réessaie. La fonction `fail` vous permet de renvoyer un code HTTP (en général 400 ou 422, dans le cas d'erreurs de validation) avec la donnée. Le code est disponible via `$page.status` et la donnée via `form` :

```diff
/// file: src/routes/login/+page.server.js
+import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

+		if (!email) {
+			return fail(400, { email, missing: true });
+		}

		const user = await db.getUser(email);

+		if (!user || user.password !== hash(password)) {
+			return fail(400, { email, incorrect: true });
+		}

		cookies.set('sessionid', await db.createSession(user), { path: '/' });

		return { success: true };
	},
	register: async (event) => {
		// TODO inscrire l'utilisateur
	}
};
```

> Notez que par précaution, nous renvoyons uniquement l'email à la page — pas le mot de passe.

```diff
/// file: src/routes/login/+page.svelte
<form method="POST" action="?/login">
+	{#if form?.missing}<p class="error">The email field is required</p>{/if}
+	{#if form?.incorrect}<p class="error">Invalid credentials!</p>{/if}
	<label>
		Email
-		<input name="email" type="email">
+		<input name="email" type="email" value={form?.email ?? ''}>
	</label>
	<label>
		Mot de passe
		<input name="password" type="password">
	</label>
	<button>Connexion</button>
	<button formaction="?/register">Inscription</button>
</form>
```

La donnée renvoyée doit être sérialisable en <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span>. À part ça, vous pouvez utiliser la structure que vous voulez. Par exemple, si vous avez plusieurs formulaires sur la page, vous pouvez distinguer à quel `<form>` la donnée `form` fait référence avec une propriété `id` ou équivalent.

### Redirections

Les redirections (et erreurs) fonctionnent exactement de la même façon que dans [`load`](load#redirections) :

```diff
/// file: src/routes/login/+page.server.js
+import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
+	login: async ({ cookies, request, url }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		if (!user) {
			return fail(400, { email, missing: true });
		}

		if (user.password !== hash(password)) {
			return fail(400, { email, incorrect: true });
		}

		cookies.set('sessionid', await db.createSession(user), { path: '/' });

+		if (url.searchParams.has('redirectTo')) {
+			redirect(303, url.searchParams.get('redirectTo'));
+		}

		return { success: true };
	},
	register: async (event) => {
		// TODO inscrire l'utilisateur
	}
};
```

## Chargement de données

Après l'exécution d'une action, la page est re-rendue (à moins qu'une redirection ou une erreur inattendue ne se produise). La valeur de retour de l'action rendue disponible dans la page en tant que la <span class="vo">[prop](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#prop)</span> `form`. Cela implique que les fonctions `load` de votre page sont exécutées après l'exécution de l'action.

Notez que `handle` est exécutée avant l'invocation de l'action, et n'est pas rejouée avant les fonctions `load`. Cela signifie que si, par exemple, vous utilisez `handle` pour remplir `event.locals` en fonction d'un cookie, vous devez mettre à jour `event.locals` lorsque vous définissez ou supprimez le cookie dans une action :

```js
/// file: src/hooks.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
		} | null
	}
}

// @filename: global.d.ts
declare global {
	function getUser(sessionid: string | undefined): {
		name: string;
	};
}

export {};

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUser(event.cookies.get('sessionid'));
	return resolve(event);
}
```

```js
/// file: src/routes/account/+page.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
		} | null
	}
}

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		user: event.locals.user
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	logout: async (event) => {
		event.cookies.delete('sessionid', { path: '/' });
		event.locals.user = null;
	}
};
```

## Amélioration progressive

Dans les sections précédentes nous avons construit une action `/login` qui fonctionne [même sans JavaScript côté client](https://kryogenix.org/code/browser/everyonehasjs.html) — pas un seul `fetch` en vue. C'est très bien, mais lorsque JavaScript _est_ disponible, nous pouvons améliorer nos interactions de formulaire pour proposer une meilleure expérience utilisateur.

### use:enhance

La façon la plus simple d'améliorer progressivement un formulaire est d'ajouter l'action `use:enhance` :

```diff
/// file: src/routes/login/+page.svelte
<script>
+	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

+<form method="POST" use:enhance>
```

> Oui, c'est un peu déroutant que l'action `enhance` et l'action de formulaire `<form action>` soient toutes les deux appelées des "actions". Cette documentation est remplie d'actions. Désolé.

Sans argument, `use:enhance` va simuler le comportement natif du navigateur, sauf le chargement intégral de la page. L'action va donc :

- mettre à jour la propriété `form`, les valeurs `$page.form` et `$page.status` lors d'une réponse valide ou invalide, mais seulement si l'action est sur la même page depuis laquelle vous avez envoyé le formulaire. Par exemple, si votre formulaire ressemble à `<form action="/quelque/part/ailleurs" ..>`, `form` et `$page` ne seront _pas_ mises à jour. Cela s'explique par le fait que lors d'une soumission de formulaire native nous serions redirigés vers la page correspondant à l'action. Si vous souhaitez tout de même les mettre à jour, utilisez [`applyAction`](#am-lioration-progressive-personnaliser-use-enhance)
- réinitialiser l'élément `<form>`
- invalider toutes les données en utilisant `invalidateAll` si la réponse est un succès
- appeler `goto` lors d'une réponse de redirection
- rendre le composant `+error` le plus proche si une erreur se produit
- [réinitialiser le focus](accessibility#gestion-du-focus) sur l'élément approprié

### Personnaliser `use:enhance`

Pour personnaliser le comportement, vous pouvez fournir une fonction de type `SubmitFunction` qui sera jouée immédiatement avant la soumission du formulaire, et renverra (optionnellement) un <span class="vo">[callback](PUBLIC_SVELTE_SITE_URL/docs/development#callback)</span> qui s'exécutera avec le résultat de l'action `ActionResult`. Notez que si vous renvoyez un callback, le comportement par défaut mentionné plus haut ne s'applique pas. Pour qu'il s'applique tout de même dans ce cas, pensez à appeler `update`.

```svelte
<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel, submitter }) => {
		// `formElement` est l'élément `<form>` courant
		// `formData` est l'objet de données `FormData` qui s'apprête à être envoyé
		// `action` est l'URL que le formulaire cible
		// appeler `cancel()` va empêcher la soumission
		// `submitter` est l'élément `HTMLElement` qui a causé la soumission du formulaire

		return async ({ result, update }) => {
			// `result` est un objet `ActionResult`
			// `update` est la fonction qui déclenche la logique par défaut qui serait jouée si le callback n'était pas défini
		};
	}}
>
```

Vous pouvez utiliser ces fonctions pour afficher ou cacher une interface de charger, ou autre.

Si vous renvoyez un <span class="vo">[callback](PUBLIC_SVELTE_SITE_URL/docs/development#callback)</span>, vous pourriez avoir besoin de reproduire en partie le comportement par défaut de `use:enhance`, mais sans invalider les données d'une réponse de succès. Vous pouvez faire cela avec `applyAction` :


```diff
/// file: src/routes/login/+page.svelte
<script>
+	import { enhance, applyAction } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel }) => {

		return async ({ result }) => {
			// `result` est un objet `ActionResult`
			if (result.type === 'redirect') {
				goto(result.location);
			} else {
				await applyAction(result);
			}
		};
	}}
>
```

Le comportement de `applyAction(result)` dépend de `result.type` :

- `success`, `failure` — définit `$page.status` à `result.status` et met à jour `form` et `$page.form` à `result.data` (peu importe d'où vous soumettez le formulaire, à la différence de `update` de `enhance`)
- `redirect` — appelle `goto(result.location, { invalidateAll: true })`
- `error` — rend le composant `+error` le plus proche avec `result.error`

Dans tous les cas, le [focus sera réinitialisé](accessibility#gestion-du-focus).

### Gestionnaire d'évènement personnalisé

Nous pouvons aussi implémenter de l'amélioration progressive nous-même, sans `use:enhance`, avec un gestionnaire d'évènement sur l'élément `<form>` :

```svelte
<!--- file: src/routes/login/+page.svelte --->
<script>
	import { invalidateAll, goto } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {any} */
	let error;

	/** @param {{ currentTarget: EventTarget & HTMLFormElement}} event */
	async function handleSubmit(event) {
		const data = new FormData(event.currentTarget);

		const response = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: data
		});

		/** @type {import('@sveltejs/kit').ActionResult} */
		const result = deserialize(await response.text());

		if (result.type === 'success') {
			// rejoue toutes les fonctions `load`, en cas de soumission réussie
			await invalidateAll();
		}

		applyAction(result);
	}
</script>

<form method="POST" on:submit|preventDefault={handleSubmit}>
	<!-- contenu -->
</form>
```

Notez que vous avez besoin de désérialiser la réponse avant d'effectuer d'autres traitements en utilisant la méthode `deserialize` de `$app/forms`. `JSON.parse()` ne suffit pas car les actions de formulaire – comme les fonctions `load` – peuvent aussi renvoyer des objets `Date` ou `BigInt`.

Si vous avez un fichier `+server.js` en plus de votre `+page.server.js`, les requêtes `fetch` seront envoyées vers `+server.js` par défaut. Pour plutôt soumettre avec `POST` vers une action de `+page.server.js`, utilisez le <span class="vo">[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> personnalisé `x-sveltekit-action` :

```diff
const response = await fetch(this.action, {
	method: 'POST',
	body: data,
+	headers: {
+		'x-sveltekit-action': 'true'
+	}
});
```

## Alternatives

Les actions de formulaires sont la méthode à privilégier pour envoyer des données au serveur, puisqu'elles peuvent améliorer progressivement votre application, mais vous pouvez aussi utiliser des fichiers [`+server.js`](routing#server) pour exposer (par exemple) une <span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span>. Voici comment une telle interaction serait écrite :

```svelte
<!--- file: send-message/+page.svelte --->
<script>
	function rerun() {
		fetch('/api/ci', {
			method: 'POST'
		});
	}
</script>

<button on:click={rerun}>Rerun CI</button>
```

```js
// @errors: 2355 1360 2322
/// file: api/ci/+server.js

/** @type {import('./$types').RequestHandler} */
export function POST() {
	// faire quelque chose
}
```

## GET vs POST

Comme nous l'avons vu, pour invoquer une action de formulaire, vous devez utiliser `method="POST"`.

Certains formulaires n'ont pas besoin d'utiliser `POST` pour envoyer des données au serveur – les `<input>` de recherche par exemple. Dans ces cas-là, vous pouvez utiliser `method="GET"` (ou de manière équivalente, ne pas spécifier l'attribut `method`), et SvelteKit les traitera alors comme les éléments `<a>`, utilisant le routeur client plutôt qu'une navigation rechargeant la page entièrement :

```html
<form action="/search">
	<label>
		Rechercher
		<input name="q">
	</label>
</form>
```

Soumettre ce formulaire va naviguer vers `/search?q=...` et invoquer votre fonction `load` mais n'invoquera pas d'action. Comme pour les éléments `<a>`, vous pouvez définir les attributs [`data-sveltekit-reload`](link-options#data-sveltekit-reload), [`data-sveltekit-replacestate`](link-options#data-sveltekit-replacestate), [`data-sveltekit-keepfocus`](link-options#data-sveltekit-keepfocus) et [`data-sveltekit-noscroll`](link-options#data-sveltekit-noscroll) sur le `<form>` pour contrôler le comportement du routeur.

## Sur le même sujet

- [Tutoriel: Forms](PUBLIC_LEARN_SITE_URL/tutorial/the-form-element)
