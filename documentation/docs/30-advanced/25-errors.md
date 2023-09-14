---
title: Erreurs
---

Les erreurs sont inévitables dans le développement logiciel. SvelteKit gère les erreurs différemment selon l'endroit où elles se produisent, leur type, et la nature de la requête entrante.

## Les objets d'erreur

SvelteKit différencie les erreurs _attendues_ et _inattendues_, les deux étant représentées comme de simples objets `{ message: string }` par défaut.

Vous pouvez ajouter des propriétés supplémentaires, comme un `code` ou un `id` de suivi, comme montré dans les exemples ci-dessous. (Lorsque vous utilisez TypeScript, ceci requiert que vous redéfinissiez le type `Error` comme décrit dans la section sur le [typage](errors#typage)).

## Erreurs attendues

Une erreur _attendue_ est une erreur créée avec l'utilitaire [`error`](modules#sveltejs-kit-error) importé depuis `@sveltejs/kit` :

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPost(slug: string): Promise<{ title: string, content: string } | undefined>
}

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const post = await db.getPost(params.slug);

	if (!post) {
		error(404, {
			message: 'Introuvable'
		});
	}

	return { post };
}
```

Ceci lève une exception que SvelteKit va attraper, ce qui aura pour conséquence de définir le statut de la réponse à 404 et de rendre un composant [`+error.svelte`](routing#error), où `$page.error` est l'objet fourni comme second argument à `error(...)`.

```svelte
<!--- file: src/routes/+error.svelte --->
<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.error.message}</h1>
```

Vous pouvez ajouter des propriétés supplémentaires à l'objet d'erreur si besoin...

```diff
error(404, {
	message: 'Introuvable',
+	code: 'NOT_FOUND'
});
```

...ou sinon, par commodité, vous pouvez fournir une chaîne de caractères en deuxième argument :

```diff
-error(404, { message: 'Not found' });
+error(404, 'Introuvable');
```

> [Avec SvelteKit 1.x](migrating-to-sveltekit-2#les-retours-des-fonctions-redirect-et-error-ne-doivent-plus-tre-lev-s-explicitement), vous deviez lever une exception avec le retour de la méthode `error` vous-même.

## Erreurs inattendues

Une erreur _inattendue_ est toute autre exception qui se produit pendant qu'une requête est traitée. Puisqu'ils peuvent contenir des informations sensibles, les messages des erreurs inattendues et leur <span class="vo">[stack trace](PUBLIC_SVELTE_SITE_URL/docs/development#stack-trace)</span> ne sont pas exposés aux utilisateurs et utilisatrices.

Par défaut, les erreurs inattendues sont affichées dans la console, (ou, en production, dans vos <span class="vo">[logs](PUBLIC_SVELTE_SITE_URL/docs/development#log)</span> de serveur), tandis que l'erreur exposée dans le client a la forme générique suivante :

```json
{ "message": "Internal Error" }
```

Les erreurs inattendues passent par le [hook `handleError`](hooks#hooks-partag-s-handleerror), où vous pouvez ajouter votre propre gestion d'erreur – par exemple envoyer les erreurs à un service de suivi, ou renvoyer au client un objet d'erreur personnalisé qui devient `$page.error`.

## Réponses

Si une erreur se produit dans `handle` ou dans un <span class="vo">[endpoint](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> de [`+server.js`](routing#server), SvelteKit répondra avec soit une page d'erreur par défaut, soit une représentation <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span> de l'objet d'erreur, en fonction des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `Accept` de la requête.

Vous pouvez personnaliser la page d'erreur par défaut en ajoutant un fichier `src/error.html` :

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>%sveltekit.error.message%</title>
	</head>
	<body>
		<h1>Ma page d'erreur par défaut</h1>
		<p>Statut: %sveltekit.status%</p>
		<p>Message: %sveltekit.error.message%</p>
	</body>
</html>
```

SvelteKit va remplacer `%sveltekit.status%` et `%sveltekit.error.message%` par leurs valeurs respectives.

Si au contraire une erreur se produit dans une fonction `load` lors d'un rendu de page, SvelteKit va rendre le composant [`+error.svelte`] le plus proche de là où l'erreur s'est produite. Si l'erreur se produit dans une fonction `load` d'un `+layout(.server).js`, le fichier d'erreur le plus proche dans l'arborescence sera un fichier `+error.svelte` _au-dessus_ de ce <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> (et pas au même niveau).

L'exception à cette règle est lorsque l'erreur se produit dans le fichier `+layout.js` ou `+layout.server.js` racine, puisque le <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine _contient_ en général le composant `+error.svelte`. Dans ce cas, SvelteKit affichera la page d'erreur par défaut.

## Typage

Si vous utilisez TypeScript et avez besoin de personnaliser la forme de vos erreurs, vous pouvez le faire en déclarant une interface `App.Error` dans votre application (par convention, dans `src/app.d.ts`, même s'elle peut se trouver dans n'importe fichier que TypeScript peut "voir") :

```diff
/// file: src/app.d.ts
declare global {
	namespace App {
		interface Error {
+			code: string;
+			id: string;
		}
	}
}

export {};
```

Cette interface incluera toujours une propriété `message: string`.

## Sur le même sujet

- [Tutoriel: Erreurs et redirections](PUBLIC_LEARN_SITE_URL/tutorial/error-basics)
- [Tutoriel: Hooks](PUBLIC_LEARN_SITE_URL/tutorial/handle)
