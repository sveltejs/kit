---
title: Options de lien
---

Dans une application SvelteKit, les éléments `<a>` sont utilisés pour naviguer entre les différentes routes de votre application, plutôt qu'avec des composants `<Link>` spécifiques au <span class="vo">[framework](PUBLIC_SVELTE_SITE_URL/docs/web#framework)</span>. Si l'utilisateur ou l'utilisatrice clique sur un lien dontl l'attribut `href` "appartient" à votre application (plutôt que de pointer vers un site extérieur par exemple), alors SvelteKit va naviguer vers la nouvelle page en important son code puis en appelant toute fonction `load` nécessaire pour le chargement des données de la page.

Vous pouvez personnaliser le comportement des liens avec des attributs `data-sveltekit-*`. Ces attributs peuvent être ajoutés à l'élément `<a>` lui-même, ou à un élément parent.

Ces options s'appliquent aussi aux éléments `<form>` avec un attribut [`method="GET"`](form-actions#get-vs-post).

## `data-sveltekit-preload-data`

Avant que le navigateur se rende compte qu'un lien n'ait été cliqué, nous pouvons détecter que le lien est en train d'être survolé (sur ordinateur) ou qu'un évènement `touchstart` ou `mousedown` a été déclenché. Dans les deux cas, nous pouvons supposer qu'un évènement `click` sur ce lien est probable.

SvelteKit peut utiliser cette information pour anticiper le téléchargement du code et des données de la page concernée, ce qui peut faire gagner quelques centaines de millisecondes – la différence entre une interface qui paraît lente et une interface qui paraît fluide.

Nous pouvons contrôler ce comportement avec l'attribut `data-sveltekit-preload-data`, qui peut avoir l'une de ces deux valeurs :
- `"hover"` signifie que le préchargement commence lorsque la souris s'arrêtre sur un lien. Sur mobile, le préchargement commence lors d'un `touchstart`
- `"tap"` signifie que le préchargement commence dès qu'un évènement `touchstart` ou `mousedown` est détecté

Un projet SvelteKit a par défaut l'attribut `data-sveltekit-preload-data="hover"` appliqué à l'élément `<body>` du fichier `src/app.html`, impliquant que tous les liens utilisent le préchargement au survol par défaut :

```html
<body data-sveltekit-preload-data="hover">
	<div style="display: contents">%sveltekit.body%</div>
</body>
```

Parfois, il n'est pas souhaitable d'appeler `load` lorsqu'un lien est survolé, soit parce qu'il est très probable qu'un clic ne suive pas le survol, soit parce que la donnée est très souvent mise à jour et un délai dans ce cas peut conduire à des données périmées.

Dans ces situations, vous pouvez spécifier la valeur `"tap"`, qui dit à SvelteKit d'appeler `load` uniquement lorsqu'un lien est cliqué :

```html
<a data-sveltekit-preload-data="tap" href="/stonks">
	Récupérer la valeur actuelle
</a>
```

> Vous pouvez aussi invoquer programmatiquement la méthode `preloadData` du module `$app/navigation`.

Les données ne seront jamais préchargées si l'utilisateur ou l'utilisatrice a activé l'usage réduit de données, impliquant que la valeur [`navigator.connection.saveData`](https://developer.mozilla.org/fr/docs/Web/API/NetworkInformation/saveData) vaut `true`.

## `data-sveltekit-preload-code`

Même dans les situations dans lesquelles vous ne souhaitez pas précharger des _données_ liées à un lien, il peut être utile de précharger le _code_ lié. L'attribut `data-sveltekit-preload-code` fonctionne de manière similaire à `data-sveltekit-preload-data`, à l'exception qu'il accepte une des quatre valeurs suivantes, classées par "empressement" décroissant :

- `"eager"` signifie que le code des liens sera immédiatement préchargé
- `"viewport"` signifie que le code d'un lien sera préchargé lors que celui-ci entre dans le <span class="vo">[viewport](PUBLIC_SVELTE_SITE_URL/docs/web#viewport)</span>
- `"hover"` - comme pour `data-sveltekit-preload-data`, mais uniquement le code est préchargé
- `"tap"` - comme pour `data-sveltekit-preload-data`, mais uniquement le code est préchargé

Notez que `viewport` et `eager` ne s'appliquent qu'aux liens présents dans le <span class="vo">[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span> immédiatement après la navigation – si un lien est ajouté plus tard (par exemple via un bloc `{#if ...}`), son préchargement ne sera pas déclenché avant un éventuel `hover` ou un `tap`. Cela permet d'éviter d'observer les changements de DOM de manière agressive, ce qui pourrait conduire à des problèmes de performance.

> Puisque le préchargement du code est un prérequis au préchargement de la donnée, cet attribut n'aura de l'effet que si sa valeur implique un comportement plus "pressé" que le comportement décrit par un éventuel attribut `data-sveltekit-preload-data` qui s'appliquerait au même élément.

Comme pour `data-sveltekit-preload-data`, cet attribut sera ignoré si l'usage réduit de données a été activé.

## `data-sveltekit-reload`

Nous avons parfois besoin de dire à SvelteKit de ne pas gérer le comportement d'un lien, et de plutôt laisser le navigateur le gérer. L'ajout de l'attribut `data-sveltekit-reload` sur un lien...

```html
<a data-sveltekit-reload href="/path">Chemin</a>
```

...va déclencher une navigation avec rechargement complet de la page lors que le lien sera cliqué.

Les liens avec l'attribut `rel="external"` auront le même traitement. De plus, ils seront ignorés lors d'un [prérendu](page-options#prerender).

## `data-sveltekit-replacestate`

Parfois, vous ne souhaitez pas que la navigation crée une nouvelle entrée dans l'historique de navigation de la session. L'ajout de l'attribut `data-sveltekit-replacestate` sur un lien...

```html
<a data-sveltekit-replacestate href="/path">Chemin</a>
```

...remplacera l'entrée courante dans `history` plutôt qu'en créer une nouvelle avec `pushState` lorsque le lien sera cliqué.

## `data-sveltekit-keepfocus`

Parfois, vous ne souhaitez pas [réinitialiser le focus](accessibility#gestion-du-focus) après la navigation. Par exemple, vous avez peut-être un formulaire de recherche qui est soumis au fur et à mesure que l'utilisateur ou l'utilisatrice entre du texte, et vous souhaitez donc garder le focus sur l'élément `<input>` de texte. L'ajout de l'attribut `data-sveltekit-keepfocus` sur le formulaire...

```html
<form data-sveltekit-keepfocus>
	<input type="text" name="query">
</form>
```

...va permettre à l'élément ayant le focus de le garder après la navigation. Il est en général recommandé d'éviter d'utiliser cet attribut sur des liens, puisque l'élément ayant le focus serait la balise `<a>` (et non un autre élément ayant eu précédemment le focus), et les lecteurs d'écran et les personnes utilisant des technologies d'assistance s'attendent à voir le focus se déplacer après une navigation. De plus, vous ne devriez utiliser cet attribut que sur des éléments qui existent toujours après la navigation, sinon, le focus sera perdu, entraînant de la confusion pour les personnes utilisant des technologies d'assistance.

## `data-sveltekit-noscroll`

Lorsqu'il navigue vers des liens internes, SvelteKit reproduit le comportement par défaut du navigateur : il réinitialise la position du défilement à 0,0 afin que l'utilisateur ou l'utilisatrice se trouve tout en haut de la page (à moins que le lien possède un `#hash`, auquel cas la position du défilement sera celle de l'élément possédant l'attribut `id` concerné).

Dans certains cas, vous pourriez souhaiter désactiver ce comportement. L'ajout de l'attribut `data-sveltekit-noscroll` sur un lien...

```html
<a href="path" data-sveltekit-noscroll>Chemin</a>
```

...empêchera la réinitialisation du défilement après un clic sur un lien.

## Désactiver les options

Pour désactiver n'importe laquelle de ces options dans un élément où elles ont été activées, utilisez la valeur `"false"` :

```html
<div data-sveltekit-preload-data>
	<!-- ces liens seront préchargés -->
	<a href="/a">a</a>
	<a href="/b">b</a>
	<a href="/c">c</a>

	<div data-sveltekit-preload-data="false">
		<!-- ces liens ne seront PAS préchargés -->
		<a href="/d">d</a>
		<a href="/e">e</a>
		<a href="/f">f</a>
	</div>
</div>
```

Pour appliquer conditionnellement un attribut à un élément, faites comme ceci :

```svelte
<div data-sveltekit-preload-data={condition ? 'hover' : false}>
```
