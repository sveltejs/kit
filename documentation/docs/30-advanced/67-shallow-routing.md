---
title: Routage superficiel
---

Lorsque vous naviguez dans une application SvelteKit, vous créez des _entrées d'historique_. En cliquant sur les boutons Précédent et Suivant, vous parcourez cette liste d'entrées, en ré-exécutant les fonctions `load` et en remplaçant les composants de la page si nécessaire.

Sometimes, it's useful to create history entries _without_ navigating. For example, you might want to show a modal dialog that the user can dismiss by navigating back. This is particularly valuable on mobile devices, where swipe gestures are often more natural than interacting directly with the UI. In these cases, a modal that is _not_ associated with a history entry can be a source of frustration, as a user may swipe backwards in an attempt to dismiss it and find themselves on the wrong page.

Il est parfois utile de créer des entrées dans l'historique _sans_ naviguer. Par exemple, vous pouvez afficher une boîte de dialogue que l'utilisateur peut fermer en revenant en arrière. C'est particulièrement utile sur téléphone, où les gestes de balayage sont souvent plus naturels que l'interaction directe avec le doigt ou la souris. Dans ce cas, une modale qui n'est _pas_ associée à une entrée de l'historique peut être une source de frustration, car l'utilisateur peut glisser vers l'arrière pour tenter de la rejeter et se retrouver sur la mauvaise page.

SvelteKit makes this possible with the [`pushState`](/docs/modules#$app-navigation-pushstate) and [`replaceState`](/docs/modules#$app-navigation-replacestate) functions, which allow you to associate state with a history entry without navigating. For example, to implement a history-driven modal:

SvelteKit rend cela possible avec les fonctions [`pushState`](/docs/modules#$app-navigation-pushstate) et [`replaceState`](/docs/modules#$app-navigation-replacestate), qui vous permettent d'associer un état à une entrée de l'historique sans naviguer. Par exemple, pour implémenter une modale qui gère l'historique :

```svelte
<!--- file: +page.svelte --->
<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import Modal from './Modal.svelte';

	function showModal() {
		pushState('', {
			showModal: true
		});
	}
</script>

{#if $page.state.showModal}
	<Modal close={() => history.back()} />
{/if}
```

The modal can be dismissed by navigating back (unsetting `$page.state.showModal`) or by interacting with it in a way that causes the `close` callback to run, which will navigate back programmatically.

La modale peut être fermée en revenant en arrière (en désactivant `$page.state.showModal`) ou en interagissant avec elle de manière à provoquer l'exécution du callback `close`, ce qui permet de revenir en arrière de manière programmatique.

## API

Le premier argument de `pushState` est l'URL, relative à l'URL courante. Pour rester sur l'URL courante, utilisez `''`.

Le deuxième argument est le nouvel état de la page, qui peut être accédé via le [sotre page](/docs/modules#$app-stores-page) via `$page.state`. Vous pouvez rendre l'état de la page sûr en déclarant l'interface [`App.PageState`](/docs/types#app) (habituellement dans `src/app.d.ts`).

Pour changer l'état d'une page sans créer un nouvel historique, utilisez `replaceState` au lieu de `pushState`.

## Chargement des données pour une route

When shallow routing, you may want to render another `+page.svelte` inside the current page. For example, clicking on a photo thumbnail could pop up the detail view without navigating to the photo page.

Lors d'un routage superficiel, vous pouvez vouloir rendre une autre `+page.svelte` à l'intérieur de la page actuelle. Par exemple, un clic sur la vignette d'une photo pour faire apparaître la vue détaillée sans passer par la page de la photo.

Pour que cela fonctionne, vous devez charger les données attendues par la page `+page.svelte`. Un moyen pratique d'y parvenir est d'utiliser [`preloadData`](/docs/modules#$app-navigation-preloaddata) dans un gestionnaire de clic `click` d'un lien `<a>`. Si l'élément (ou un parent) utilise [`data-sveltekit-preload-data`](/docs/link-options#data-sveltekit-preload-data), les données auront déjà été requêtées et `preloadData` réutilisera cette requête.

```svelte
<!--- file: src/routes/photos/+page.svelte --->
<script>
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Modal from './Modal.svelte';
	import PhotoPage from './[id]/+page.svelte';

	export let data;
</script>

{#each data.thumbnails as thumbnail}
	<a
		href="/photos/{thumbnail.id}"
		on:click={async (e) => {
			// ignore la navigation en cas d'ouverture d'un nouvel onglet, ou si l'écran est trop petit
			if (e.metaKey || innerWidth < 640) return;

			// éviter la navigation
			e.preventDefault();

			const { href } = e.currentTarget;

			// exécute les fonctions `load` (pour obtenir le résultat des fonctions `load`
			// qui sont déjà en cours d'exécution à cause de `data-sveltekit-preload-data`).
			const result = await preloadData(href);

			if (result.type === 'loaded' && result.status === 200) {
				pushState(href, { selected: result.data });
			} else {
				// il s'est passé quelque chose de grave ! Tentative de navigation
				goto(href);
			}
		}}
	>
		<img alt={thumbnail.alt} src={thumbnail.src} />
	</a>
{/each}

{#if $page.state.selected}
	<Modal on:close={() => history.back()}>
		<!-- Passez les données de la page au composant +page.svelte,
		     comme le ferait SvelteKit lors de la navigation -->
		<PhotoPage data={$page.state.selected} />
	</Modal>
{/if}
```

## Mise en garde

Lors du rendu côté serveur, `$page.state` est toujours un objet vide. Il en va de même pour la première page sur laquelle l'utilisateur arrive - si l'utilisateur recharge la page (ou revient d'une autre page), l'état ne sera _pas_ appliqué tant qu'il n'aura pas navigué.

Le routage superficiel est une fonctionnalité qui nécessite JavaScript pour fonctionner. Soyez prudent lorsque vous l'utilisez et essayez de penser à un comportement de repli raisonnable au cas où JavaScript ne serait pas disponible.
