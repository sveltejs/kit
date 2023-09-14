---
title: Modules réservés serveur
---

Tel un ami proche, SvelteKit sait garder vos secrets. Lorsque vous écrivez votre code <span class="vo">[backend](PUBLIC_SVELTE_SITE_URL/docs/web#backend)</span> et votre code <span class="vo">[frontend](PUBLIC_SVELTE_SITE_URL/docs/web#frontend)</span> dans le même projet, il est facile d'importer accidentellement des données sensibles dans votre code frontend (des variables d'environnement contenant des clés d'<span class="vo">[API](PUBLIC_SVELTE_SITE_URL/docs/developpement)</span> par exemple). SvelteKit fournit un moyen de vous protéger de ce problème : les modules réservés serveur.

## Variables d'environnement privées

Les modules `$env/static/private` et `$env/dynamic/private`, qui sont traités dans la section [modules](modules), peuvent uniquement être importés dans des modules qui sont exécutés sur le serveur, comme [`hooks.server.js`](hooks#hooks-de-serveur) ou [`+page.server.js`](routing#page-page-server-js).

## Utilitaires côté serveur Server-only utilities

Le module [`$app/server`](/docs/modules#$app-server), qui contient une fonction `read` pour lire les fichiers statiques depuis le disque, ne peut être importé que par le code serveur.

## Vos modules

Vous pouvez rendre vos propres modules réservés au serveur de deux manières :

- en ajoutant `.server` au nom de fichier, par ex. `secrets.server.js`
- en les plaçant dans le dossier `$lib/server`, par ex. `$lib/server/secrets.js`

## Comment ça marche ?

À chaque fois que du code prévu pour être affiché au public importe du code réservé au serveur (directement ou indirectement)...

```js
// @errors: 7005
/// file: $lib/server/secrets.js
export const atlantisCoordinates = [/* redacted */];
```

```js
// @errors: 2307 7006 7005
/// file: src/routes/utils.js
export { atlantisCoordinates } from '$lib/server/secrets.js';

export const add = (a, b) => a + b;
```

```html
/// file: src/routes/+page.svelte
<script>
	import { add } from './utils.js';
</script>
```

...SvelteKit déclenche l'erreur :

```
Cannot import $lib/server/secrets.js into public-facing code:
- src/routes/+page.svelte
	- src/routes/utils.js
		- $lib/server/secrets.js
```

Même si le code affiché au public – `src/routes/+page.svelte` – n'utilise que l'export `add` et non l'export de la variable secrète `atlantisCoordinates`, le code secret pourrait se retrouver dans du JavaScript que le navigateur télécharge, et donc la chaîne d'import est considérée non sécurisée.

Cette fonctionnalité marche aussi avec les imports dynamiques, même ceux utilisant l'interpolation comme ``await import(`./${foo}.js`)``, avec un léger défaut : pendant le développement, s'il y a deux imports ou plus entre le code affiché au public et le module réservé au serveur, l'import illégal ne sera pas détécté la première fois que le code est chargé.

> Les <span class="vo">[frameworks](PUBLIC_SVELTE_SITE_URL/docs/web#framework)</span> de test comme Vitest ne font pas la différence entre du code réservé serveur et du code affiché au public. Pour cette raison, la détection d'imports illégaux est désactivée lorsque les tests sont exécutés, c'est-à-dire quand `process.env.TEST === 'true'`.

## Sur le même sujet

- [Tutoriel: Variables d'environment](PUBLIC_LEARN_SITE_URL/tutorial/env-static-private)
