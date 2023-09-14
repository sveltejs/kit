---
title: Routing avancé
---

## Paramètres de reste

Si le nombre de segments de route est inconnu, vous pouvez utiliser la syntaxe de reste – vous pouvez par exemple implémenter le visualisateur de fichiers de Github de cette manière...

```bash
/[org]/[repo]/tree/[branch]/[...file]
```

...auquel cas une requête vers `/sveltejs/kit/tree/main/documentation/docs/04-advanced-routing.md` rendrait disponibles les paramètres suivants dans la page :

```js
// @noErrors
{
	org: 'sveltejs',
	repo: 'kit',
	branch: 'main',
	file: 'documentation/docs/04-advanced-routing.md'
}
```

> `src/routes/a/[...rest]/z/+page.svelte` correspond à `/a/z` (c'est-à-dire sans aucun paramètre), ainsi qu'à `/a/b/z` et `/a/b/c/z` et ainsi de suite. Assurez-vous de bien vérifier que la valeur de votre paramètre de reste est valide, en utilisant par exemple une [fonction `match`](#fonctions-match).

### Pages 404

Les paramètres de reste vous permettent également d'afficher des pages 404 personnalisées. Étant données ces routes...

```
src/routes/
├ marx-brothers/
│ ├ chico/
│ ├ harpo/
│ ├ groucho/
│ └ +error.svelte
└ +error.svelte
```

...le fichier `marx-brothers/+error.svelte` ne sera _pas_ rendu si vous vous rendez sur `/marx-brothers/karl`, parce qu'aucune route ne correspond. Si vous voulez afficher la page d'erreur imbriquée, vous devez créer une route qui correspond à toute requête `/marx-brothers/*`, et renvoyer une 404 depuis cette route :

```diff
src/routes/
├ marx-brothers/
+| ├ [...path]/
│ ├ chico/
│ ├ harpo/
│ ├ groucho/
│ └ +error.svelte
└ +error.svelte
```

```js
/// file: src/routes/marx-brothers/[...path]/+page.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load(event) {
	error(404, 'Not Found');
}
```

> Si vous ne gérez pas les cas 404, ils seront à gérer dans [`handleError`](hooks#hooks-partag-s-handleerror)

## Paramètres optionnels

Une route comme `[lang]/home` contient un paramètre appelé `lang` qui est requis. Il est parfois bénéfique de rendre ces paramètres optionnels, pour diriger dans cet exemple `home` et `en/home` vers la même page. Vous pouvez faire cela en entourant le paramètre dans une autre paire de crochets : `[[lang]]/home`.

Notez qu'un paramètre de route optionnel ne peut pas être placé à la suite d'un paramètre de reste (`[...rest]/[[optional]]`), puisque le paramètre de reste, étant générique, va s'appliquer en premier et sur toute la route, rendant le paramètre optionnel systématiquement inutilisé.

## Fonctions `match`

Une route comme `src/routes/archive/[page]` peut correspondre à `/archive/3`, mais aussi à `/archive/potato`. Ce n'est pas souhaitable. Vous voulez vous assurer que les paramètres de route sont bien formés en ajoutant une _fonction `match`_ – qui prend en argument la chaîne de caractères représentant le paramètre (`"3"` ou `"potato"`) et renvoie `true` si le paramètre est valide – dans votre dossier [`params`](configuration#files)...

```js
/// file: src/params/integer.js
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^\d+$/.test(param);
}
```

...et en ajustant vos routes :

```diff
-src/routes/archive/[page]
+src/routes/archive/[page=integer]
```

Si le chemin ne correspond pas, SvelteKit testera d'autres routes (en utilisant l'ordre précisé plus bas), avant d'éventuellement renvoyer une 404 s'il ne trouve rien.

Chaque module dans le dossier `params` correspond à une fonction `match`, à l'exception des fichiers `*.test.js` et `*.spec.js` qui peuvent être utilisés pour tester vos fonctions `match`.

> Les fonctions `match` sont exécutées à la fois sur le serveur et dans le navigateur.

## Tri des routes

Il est possible que plusieurs routes soient compatibles pour un chemin demandé. Par exemple, chacune de ces routes sont compatibles avec `/foo-abc` :

```bash
src/routes/[...catchall]/+page.svelte
src/routes/[[a=x]]/+page.svelte
src/routes/[b]/+page.svelte
src/routes/foo-[c]/+page.svelte
src/routes/foo-abc/+page.svelte
```

SvelteKit a besoin de savoir quelle route est en train d'être requêtée. Pour cela, SvelteKit tri les routes selon les règles suivantes...

- Les routes plus spécifiques ont une priorité plus élevée (par exemple, une route avec aucun paramètre est plus spécifique qu'une route avec un paramètre dynamique, et ainsi de suite)
- Les paramètres avec des [fonctions `match`](#fonctions-match) (`[name=type]`) ont une priorité plus élevée que celles sans (`[name]`)
- Les paramètres `[[optional]]` et `[...rest]` sont ignorés à moins qu'ils soient tout à la fin de la route, auquel cas ils sont traitées avec la priorité la plus faible. En d'autres mots `x/[[y]]/z` est traité de manière équivalente à `x/z` d'un point de vue du tri
- Les égalités sont résolues par ordre alphabétique

...ce qui donne l'ordre suivant, impliquant que `/foo-abc` va invoquer `src/routes/foo-abc/+page.svelte`, et `/foo-def` va invoquer `src/routes/foo-[c]/+page.svelte` plutôt que des routes moins spécifiques :

```bash
src/routes/foo-abc/+page.svelte
src/routes/foo-[c]/+page.svelte
src/routes/[[a=x]]/+page.svelte
src/routes/[b]/+page.svelte
src/routes/[...catchall]/+page.svelte
```

## Encodage

Certains caractères ne peuvent pas être utilisés pas le système de fichiers – `/` sur Linux et Mac, `\ / : * ? " < > |` sur Windows. Les caractères `#` et `%` ont un sens particulier dans les URLs, et les caractères `[ ] ( )` ont un sens particulier pour SvelteKit, ce qui implique qu'ils ne peuvent pas non plus être utilisés directement comme morceaux de votre route.

Pour utiliser ces caractères dans vos routes, vous pouvez utiliser leurs équivalents hexadécimaux, qui ont le format `[x+nn]` où `nn` est le code d'un caractère en hexadécimal :

- `\` — `[x+5c]`
- `/` — `[x+2f]`
- `:` — `[x+3a]`
- `*` — `[x+2a]`
- `?` — `[x+3f]`
- `"` — `[x+22]`
- `<` — `[x+3c]`
- `>` — `[x+3e]`
- `|` — `[x+7c]`
- `#` — `[x+23]`
- `%` — `[x+25]`
- `[` — `[x+5b]`
- `]` — `[x+5d]`
- `(` — `[x+28]`
- `)` — `[x+29]`

Par exemple, pour créer une route `/smileys/:-)`, vous devez créer un fichier `src/routes/smileys/[x+3a]-[x+29]/+page.svelte`.

Vous pouvez déterminer le code hexadécimal d'un caractère avec JavaScript :

```js
':'.charCodeAt(0).toString(16); // '3a', donc '[x+3a]'
```

Vous pouvez aussi utiliser des séquences Unicode. Généralement vous ne devriez pas en avoir besoin car vous pouvez utiliser le caractère non encodé directement, mais si – pour une raison ou une autre – vous ne pouvez pas avoir de nom de fichier incluant un emoji, par exemple, vous pouvez alors utiliser les séquences Unicode. En d'autres mots, ces noms de fichiers sont équivalents :

```
src/routes/[u+d83e][u+dd2a]/+page.svelte
src/routes/🤪/+page.svelte
```

Le format pour une séquence Unicode est `[u+nnnn]` où `nnnn` est une valeur valide entre `0000` et `10ffff`. (À l'inverse des séquences hexadécimales de JavaScript, il n'y a pas besoin d'utiliser deux mots (codets) successifs pour représenter des points au-delà de `ffff`.) Pour en savoir plus sur l'encodage Unicode, consultez [Programming with Unicode](https://unicodebook.readthedocs.io/unicode_encodings.html) (en anglais).

> Puisque TypeScript [peine](https://github.com/microsoft/TypeScript/issues/13399) avec les dossiers dont le nom commence par un `.`, vous pourriez trouver utile d'encoder ce caractère lorsque vous créez une route [`.well-known`](https://en.wikipedia.org/wiki/Well-known_URI) par exemple : `src/routes/[x+2e]well-known/...`.

## Layouts avancés

Par défaut, la _hiérarchie de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>_ reflète la _hiérarchie de route_. Dans certains cas, il arrive que cela ne soit pas pertinent.

### (group)

Vous avez peut-être des routes de type "application" qui ont un <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> (par exemple `/dashboard` or `/item`), et d'autres routes de type "marketing" qui ont besoin d'un layout différent (`/a-propos` ou `/temoignages`). Nous pouvons grouper ces routes dans un dossier dont le nom est entre parenthèses – contrairement aux dossiers normaux, `(app)` et `(marketing)` n'affectent pas le chemin de l'URL des routes qu'ils contiennent :

```diff
src/routes/
+│ (app)/
│ ├ dashboard/
│ ├ item/
│ └ +layout.svelte
+│ (marketing)/
│ ├ a-propos/
│ ├ temoignages/
│ └ +layout.svelte
├ admin/
└ +layout.svelte
```

Vous pouvez aussi mettre un fichier `+page` directement dans un dossier `(group)`, par exemple si `/` doit être une page `(app)` ou `(marketing)`.

### S'échapper des layouts

Le <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine s'applique à toutes les pages de votre application – si vous n'en créez pas, il sera considéré par défaut comme `<slot />`. Si vous voulez que certaines pages aient une hiérarchie de layout différente des autres, vous pouvez alors mettre toute votre application dans un ou plusieurs groupes _sauf_ les routes qui ne doivent pas hériter des layouts communs.

Dans l'exemple au-dessus, la route `/admin` n'hérite pas des <span class="vo">[layouts](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> `(app)` ou `(marketing)`.

### +page@

Les pages peuvent s'échapper de la hiérarchie de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> courante, route par route. Supposez que nous ayons une route `/item/[id]/embed` dans le groupe `(app)` de l'exemple précédent :

```diff
src/routes/
├ (app)/
│ ├ item/
│ │ ├ [id]/
│ │ │ ├ embed/
+│ │ │ │ └ +page.svelte
│ │ │ └ +layout.svelte
│ │ └ +layout.svelte
│ └ +layout.svelte
└ +layout.svelte
```

Par défaut, cette route hérite du <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine, du layout `(app)`, du layout `item` et du layout `[id]`. Nous pouvons redéfinir cette hiérarchie en ajoutant au nom du fichier de page le caractère `@` suivi du layout cible – ou, pour le layout racine, la chaîne de caractères vide. Dans cet exemple, nous pouvons choisir une option parmi les suivantes :

- `+page@[id].svelte` - hérite de `src/routes/(app)/item/[id]/+layout.svelte`
- `+page@item.svelte` - hérite de `src/routes/(app)/item/+layout.svelte`
- `+page@(app).svelte` - hérite de `src/routes/(app)/+layout.svelte`
- `+page@.svelte` - hérite de `src/routes/+layout.svelte`

```diff
src/routes/
├ (app)/
│ ├ item/
│ │ ├ [id]/
│ │ │ ├ embed/
+│ │ │ │ └ +page@(app).svelte
│ │ │ └ +layout.svelte
│ │ └ +layout.svelte
│ └ +layout.svelte
└ +layout.svelte
```

### +layout@

Comme les pages, les <span class="vo">[layouts](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> peuvent _eux-mêmes_ s'échapper de leur hiérarchie de layout, en utilisant la même technique. Par exemple, un composant `+layout@.svelte` peut réinitialiser sa hiérarchie pour toutes ses routes enfant.

```
src/routes/
├ (app)/
│ ├ item/
│ │ ├ [id]/
│ │ │ ├ embed/
│ │ │ │ └ +page.svelte  // utilise (app)/item/[id]/+layout.svelte
│ │ │ ├ +layout.svelte  // hérite de (app)/item/+layout@.svelte
│ │ │ └ +page.svelte    // utilise (app)/item/+layout@.svelte
│ │ └ +layout@.svelte   // hérite du layout racine, évitant (app)/+layout.svelte
│ └ +layout.svelte
└ +layout.svelte
```

### Cas d'utilisation des groupes de layout

Toutes les situations ne sont pas adaptées aux groupes de <span class="vo">[layouts](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>, et vous ne devez pas vous sentir obligé•e de les utiliser. Votre cas particulier pourrait conduire à une imbrication complexe de `(group)`, ou peut-être que vous ne souhaitez pas introduire un `(group)` pour une seule route. Il est tout-à-fait acceptable d'utiliser d'autres moyens comme la composition (des fonctions `load` ou composants Svelte réutilisables), ou des blocs `if` pour construire votre application. L'exemple suivant montre un layout qui hérite du layout racine et réutilise des composants et fonctions que d'autres layouts peuvent aussi utiliser :

```svelte
<!--- file: src/routes/nested/route/+layout@.svelte --->
<script>
	import ReusableLayout from '$lib/ReusableLayout.svelte';
	export let data;
</script>

<ReusableLayout {data}>
	<slot />
</ReusableLayout>
```

```js
/// file: src/routes/nested/route/+layout.js
// @filename: ambient.d.ts
declare module "$lib/reusable-load-function" {
	export function reusableLoad(event: import('@sveltejs/kit').LoadEvent): Promise<Record<string, any>>;
}
// @filename: index.js
// ---cut---
import { reusableLoad } from '$lib/reusable-load-function';

/** @type {import('./$types').PageLoad} */
export function load(event) {
	// Ajoutez de la logique supplémentaire ici, si besoin
	return reusableLoad(event);
}
```

## Sur le même sujet

- [Tutoriel: Routing avancé](PUBLIC_LEARN_SITE_URL/tutorial/optional-params)
