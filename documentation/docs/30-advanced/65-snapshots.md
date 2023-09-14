---
title: Snapshots
---

L'état éphémère du <span class="vo">[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span> – comme les positions des barres de défilement, le contenu des éléments `<inputs>` et d'autres choses – est perdu lorsque vous naviguez d'une page à une autre.

Par exemple, si l'utilisateur ou l'utilisatrice remplit un formulaire mais clique sur un lien avant de l'avoir soumis, puis revient en arrière grâce au bouton "Retour" de son navigateur, les valeurs précédemment remplies auront disparues. Dans les cas où il est important de sauvegarder ces valeurs, vous pouvez prendre un <span class="vo">_[snapshot](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#snapshot)_</span> de l'état du <span class="vo">[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span>, qui sera restauré si la personne revient sur la page.

Pour faire cela, exportez un objet `snapshot` avec les méthodes `capture` et `restore` depuis un fichier `+page.svelte` or `+layout.svelte` :

```svelte
<!--- file: +page.svelte --->
<script>
	let comment = '';

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => comment,
		restore: (value) => comment = value
	};
</script>

<form method="POST">
	<label for="comment">Commentaire</label>
	<textarea id="comment" bind:value={comment} />
	<button>Publier le commentaire</button>
</form>
```

Lorsque vous naviguez en dehors de cette page, la fonction `capture` est appelée immédiatement avant la mise à jour de la page, et la valeur renvoyée est associée à l'entrée courante dans la pile d'historique du navigateur. Si vous revenez sur la page, la fonction `restore` est appelée avec la valeur stockée dès que la page est mise à jour.

La donnée doit être sérialisable en <span class="vo">[JSON](PUBLIC_SVELTE_SITE_URL/docs/web#json)</span> afin qu'elle puisse être persistée dans `sessionStorage`. Cela permet à l'état d'être restauré lorsque la page est rechargée, ou lorsque l'utilisateur ou l'utilisatrice revient sur la page depuis un autre site.

> Évitez de stocker de très gros objets avec `capture` – une fois "capturés", les objets seront gardés en mémoire pour la durée de la session, et pourraient être dans certains cas trop lourds pour être persistés dans `sessionStorage`.
