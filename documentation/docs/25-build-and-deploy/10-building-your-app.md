---
title: Compiler votre application
---

Compiler une application SvelteKit se fait en deux étapes, qui se produisent lorsque vous lancez `vite build` (en général via `npm run build`).

D'abord, Vite crée un <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> de production de votre code serveur, votre code navigateur, et votre <span class="vo">[service worker](PUBLIC_SVELTE_SITE_URL/docs/web#service-worker)</span> (si vous en avez un). Le [prérendu](page-options#prerender) est exécuté à ce moment, si nécessaire.

Ensuite, un _adaptateur_ récupère ce <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> de production et l'ajuste pour votre environnement cible — vous en saurez plus dans les pages à venir.

## Pendant la compilation

SvelteKit va charger vos fichiers `+page/layout(.server).js` (et tous les fichiers qu'ils importent) pour les analyser pendant la compilation. Tout code qui ne doit _pas_ être exécuté à cette étape doit être inclus dans un bloc conditionné à la valeur `false` de la variable `building` de [`$app/environment`](modules#$app-environment) :

```diff
+import { building } from '$app/environment';
import { setupMyDatabase } from '$lib/server/database';

+if (!building) {
	setupMyDatabase();
+}

export function load() {
	// ...
}
```

## Prévisualiser votre application

Après la compilation, vous pouvez voir votre <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> de production localement avec `vite preview` (via `npm run preview`). Notez que ceci va lancer l'application dans Node, et n'est donc pas une reproduction parfaite de votre application déployée – des ajustements spécifiques à l'adaptateur comme l'[objet `platform`](adapters#contexte-sp-cifique-chaque-plateforme) ne sont pas appliqués dans les prévisualisations.
