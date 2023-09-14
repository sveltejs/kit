---
title: Migrer vers SvelteKit v2
---

La mise à jour de SvelteKit de la version 1 vers la version 2 devrait se faire en douceur. Il y a quelques changements majeurs à noter, qui sont listés ici. Vous pouvez utiliser `npx svelte-migrate@latest sveltekit-2` pour migrer automatiquement certains de ces changements.

Nous recommandons vivement de mettre à jour à la version 1.x la plus récente avant de passer à la version 2.0, afin de pouvoir bénéficier des avertissements de dépréciation ciblés. Nous recommandons également de [mettre à jour vers Svelte 4](PUBLIC_SVELTE_SITE_URL/docs/v4-migration-guide) en premier lieu : Les dernières versions de SvelteKit 1.x le prennent en charge, et SvelteKit 2.0 l'exige.

## Les retours des fonctions `redirect` et `error` ne doivent plus être levés explicitement

Auparavant, vous deviez lever vous-même les valeurs retournées par `error(...)` et `redirect(...)`. Dans SvelteKit 2, ce n'est plus le cas - il suffit d'appeler les fonctions.

```diff
import { error } from '@sveltejs/kit'

...
- throw error(500, "quelque chose s'est mal passé");
+ error(500, "quelque chose s'est mal passé");
```

`svelte-migrate` fera ces changements automatiquement pour vous.

Si l'erreur ou la redirection est levée à l'intérieur d'un bloc `try {...}` (conseil : ne faites jamais ça !), vous pouvez les distinguer des erreurs inattendues en utilisant [`isHttpError`](/docs/modules#sveltejs-kit-ishttperror) et [`isRedirect`](/docs/modules#sveltejs-kit-isredirect) importés de `@sveltejs/kit`.

## Le `path` est requis pour l'installation des cookies

Lorsqu'ils reçoivent un en-tête `Set-Cookie` qui ne spécifie pas de `path`, les navigateurs [fixent le `path` du cookie](https://www.rfc-editor.org/rfc/rfc6265#section-5.1.4) (en anglais) au parent de la ressource en question. Ce comportement n'est pas particulièrement utile ou intuitif, et entraîne souvent des bugs parce que le développeur ou la développeuse s'attendait à ce que le cookie s'applique à l'ensemble du domaine.

Depuis SvelteKit 2.0, vous devez définir un `path` lorsque vous appelez `cookies.set(...)`, `cookies.delete(...)` ou `cookies.serialize(...)` afin qu'il n'y ait pas d'ambiguïté. La plupart du temps, vous voudrez probablement utiliser `path : '/'`, mais vous pouvez lui donner la valeur que vous voulez, y compris des chemins relatifs. Le path `''` signifie "le chemin courant", `'.'` signifie 'le répertoire courant'.

```diff
export function load({ cookies }) {
-    cookies.set(name, value);
+    cookies.set(name, value, { path: '/' });
    return { response }
}
```

`svelte-migrate` ajoutera des commentaires aux emplacements qui doivent être ajustés.

## Les promesses de premier niveau ne sont plus attendues

Dans SvelteKit version 1, si les propriétés de premier niveau de l'objet retourné par une fonction `load` étaient des promesses, elles étaient automatiquement attendues. Avec l'introduction de [streaming](https://svelte.dev/blog/streaming-snapshots-sveltekit) (en anglais), ce comportement est devenu un peu gênant car il vous obligeait à imbriquer les données streamées à un niveau de profondeur.

À partir de la version 2, SvelteKit ne fait plus de différence entre les promesses de niveau supérieur et celles qui ne le sont pas. Pour retrouver le comportement bloquant, utilisez `await` (avec `Promise.all` pour éviter les cascades, le cas échéant) :

```diff
// Si vous avez une seule promesse
export function load({ fetch }) {
-    const response = fetch(...).then(r => r.json());
+    const response = await fetch(...).then(r => r.json());
    return { response }
}
```

```diff
// Si vous avez plusieurs promesses
export function load({ fetch }) {
-    const a = fetch(...).then(r => r.json());
-    const b = fetch(...).then(r => r.json());
+    const [a, b] = await Promise.all([
+      fetch(...).then(r => r.json()),
+      fetch(...).then(r => r.json()),
+    ]);
    return { a, b };
}
```

## Changement de la méthode goto(...)

`goto(...)` n'accepte plus d'URLs externes. Pour naviguer vers une URL externe, utilisez `window.location.href = url`. L'objet `state` détermine désormais la valeur de `$page.state` et doit correspondre à l'interface `App.PageState`, si déclarée. Voir la section sur le [routage superficiel](shallow-routing) pour plus d'informations.

## Les chemins sont désormais relatifs par défaut

Dans SvelteKit 1, `%sveltekit.assets%` utilisé dans `app.html` était remplacé par un chemin relatif par défaut (c'est-à-dire `.` ou `..` ou `../..` etc, selon le chemin rendu) pendant le rendu côté serveur à moins que l'option de configuration [`paths.relative`](/docs/configuration#paths) n'ait été explicitement mise à `false`. La même chose était vraie pour `base` et `assets` importés de `$app/paths`, mais seulement si l'option `paths.relative` était explicitement fixée à `true`.

Cette incohérence est corrigée dans la version 2. Les chemins sont soit toujours relatifs, soit toujours absolus, en fonction de la valeur de [`paths.relative`](/docs/configuration#paths). La valeur par défaut est `true` car cela permet d'obtenir des applications plus portables : si la `base` est autre chose que l'application attendue (comme c'est le cas lorsqu'elle est visualisée sur [Internet Archive](https://archive.org/), par exemple) ou inconnue au moment de la compilation (comme c'est le cas lorsqu'elle est déployée sur [IPFS](https://ipfs.tech/) et ainsi de suite), il y a moins de risque que le déploiement ne fonctionne pas.

## Les appels `fetch` depuis le serveur ne sont plus traçables

Auparavant, il était possible de suivre les URLs des appels `fetch` sur le serveur afin de réexécuter les fonctions de chargement. Cela pose un risque de sécurité (fuite d'URLs privées), et c'est pourquoi le paramètre permetant de l'activer était sous `dangerZone` : `dangerZone.trackServerFetches`, qui est maintenant supprimé.

## Les arguments `preloadCode` doivent être préfixés par `base`

SvelteKit expose deux fonctions, [`preloadCode`](/docs/modules#$app-navigation-preloadcode) et [`preloadData`](/docs/modules#$app-navigation-preloaddata), pour charger programmatiquement le code et les données associées à un chemin particulier. Dans la version 1, il y avait une incohérence subtile - le chemin passé à `preloadCode` n'avait pas besoin d'être préfixé avec le chemin `base` (s'il était défini), alors que le chemin passé à `preloadData` devait l'être.

Ceci est corrigé dans SvelteKit 2 - dans les deux cas, le chemin doit être préfixé par `base` s'il est défini.

De plus, `preloadCode` prend maintenant un seul argument au lieu de _n_ arguments.

## `resolvePath` a été supprimé

SvelteKit 1 incluait une fonction appelée `resolvePath` qui vous permettait de résoudre un identifiant de route (comme `/blog/[slug]`) et un ensemble de paramètres (comme `{ slug : 'hello' }`) en un chemin. Malheureusement, la valeur de retour n'incluait pas le chemin `base`, ce qui limitait son utilité dans les cas où `base` était défini.

Ainsi, SvelteKit 2 remplace `resolvePath` par une fonction (légèrement mieux nommée) appelée `resolveRoute`, qui peut être importée de `$app/paths` et qui prend en compte `base`.

```diff
-import { resolvePath } from '@sveltejs/kit';
-import { base } from '$app/paths';
+import { resolveRoute } from '$app/paths';

-const path = base + resolvePath('/blog/[slug]', { slug });
+const path = resolveRoute('/blog/[slug]', { slug });
```

`svelte-migrate` remplacera la méthode pour vous, mais si vous ajoutez ensuite `base` au résultat, vous devrez l'enlever vous-même.

## Amélioration de la gestion des erreurs

Les erreurs sont gérées de manière incohérente dans SvelteKit 1. Certaines erreurs déclenchent le hook `handleError` mais il n'y a pas de bonne façon de discerner leur statut (par exemple, la seule façon de distinguer une erreur 404 d'une erreur 500 est de voir si `event.route.id` est `null`), alors que d'autres (comme les erreurs 405 pour les requêtes `POST` vers des pages sans actions) ne déclenchent pas `handleError`, mais devraient le faire. Dans ce dernier cas, le résultat `$page.error` est différent du type [`App.Error`](/docs/types#app-error), s'il est spécifié.

SvelteKit 2 simplifie cela en appelant les hooks `handleError` avec deux nouvelles propriétés : `status` et `message`. Pour les erreurs lancées par votre code (ou le code d'une bibliothèque appelé par votre code), le statut sera `500` et le message sera `Internal Error`. Alors que `error.message` peut contenir des informations sensibles qui ne devraient pas être exposées aux utilisateurs et utilisatrices, `message` est sûr.

## Les variables d'environnement dynamiques ne peuvent pas être utilisées pendant le prérendu

Les modules `$env/dynamic/public` et `$env/dynamic/private` donnent accès aux variables d'environnement <span class="vo">[runtime](PUBLIC_SVELTE_SITE_URL/docs/development#runtime)</span>, par opposition aux variables d'environnement <span class="vo">[build-time](PUBLIC_SVELTE_SITE_URL/docs/development#build-time)</span> exposées par `$env/static/public` et `$env/static/private`.

Pendant le prérendu dans SvelteKit 1, elles sont une seule et même chose. Ainsi, les pages pré-rendues qui utilisent des variables d'environnement "dynamiques" intègrent en réalité les valeurs des variables au moment du <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span>, ce qui est incorrect. Pire encore, `$env/dynamic/public` est complété dans le navigateur avec ces valeurs périmées si l'utilisateur arrive sur une page pré-rendue avant de naviguer vers des pages rendues dynamiquement.

Pour cette raison, les variables d'environnement dynamiques ne peuvent plus être lues pendant le pré-rendu dans SvelteKit 2 - vous devez utiliser les modules `static` à la place. Si l'utilisateur arrive sur une page pré-rendue, SvelteKit demandera les valeurs à jour pour `$env/dynamic/public` depuis le serveur (par défaut depuis un module appelé `_env.js` - ceci peut être configuré avec `config.kit.env.publicModule`) au lieu de les lire depuis le HTML rendu par le serveur.

## `form` et `data` ont été supprimés des callbacks `use:enhance`.

Si vous fournissez un <span class='vo'>[callback](PUBLIC_SVELTE_SITE_URL/docs/development#callback)</span> à [`use:enhance`](/docs/form-actions#am-lioration-progressive-use-enhance), il sera appelé avec un objet contenant diverses propriétés utiles.

Dans SvelteKit 1, ces propriétés incluaient `form` et `data`. Elles ont été dépréciées il y a quelque temps en faveur de `formElement` et `formData`, et ont été complètement supprimées dans SvelteKit 2.

## Les formulaires contenant des entrées de type fichier doivent utiliser `multipart/form-data`

Si un formulaire contient un `<input type="file">` mais n'a pas d'attribut `enctype="multipart/form-data"`, les soumissions non-JS ne tiendront pas compte du fichier. SvelteKit 2 lancera une erreur s'il rencontre un formulaire de ce type lors d'une soumission `use:enhance` pour s'assurer que vos formulaires fonctionnent correctement lorsque JavaScript n'est pas disponible.

## Le fichier de configuration `tsconfig.json` généré est plus strict

Auparavant, le fichier de configuration `tsconfig.json` généré faisait de son mieux pour produire une configuration valide lorsque votre `tsconfig.json` incluait `paths` ou `baseUrl`. Dans SvelteKit 2, la validation est plus stricte et vous avertira si vous utilisez `paths` ou `baseUrl` dans votre `tsconfig.json`. Ces paramètres sont utilisés pour générer des alias de chemin et vous devriez utiliser [l'attribut `alias`](configuration#alias) dans votre fichier `svelte.config.js` à la place, pour rendre l'alias disponible pour le <span class="vo">[bundler](PUBLIC_SVELTE_SITE_URL/docs/web#bundler-packager)</span>.

## `getRequest` ne lève plus d'erreurs

Le module `@sveltejs/kit/node` exporte des fonctions utilitaires à utiliser dans les environnements Node, y compris `getRequest` qui transforme un [`ClientRequest`](https://nodejs.org/api/http.html#class-httpclientrequest) Node en un objet [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) standard.

Dans SvelteKit 1, `getRequest` pouvait générer une erreur si l'en-tête `Content-Length` dépassait la taille limite spécifiée. Dans SvelteKit 2, l'erreur ne sera levée que plus tard, lorsque le corps de la requête (s'il y en a un) sera lu. Cela permet de meilleurs diagnostics et un code plus simple.

## `vitePreprocess` n'est plus exporté par `@sveltejs/kit/vite`

Puisque `@sveltejs/vite-plugin-svelte` est maintenant une dépendance dont dépend `@sveltejs/kit`, SvelteKit 2 ne réexporte plus `vitePreprocess`. Vous devez l'importer directement depuis `@sveltejs/vite-plugin-svelte`.

## Mise à jour des dépendances

SvelteKit 2 nécessite Node `18.13` ou plus, et les dépendances minimales suivantes :

- `svelte@4`
- `vite@5`
- `typescript@5`
- `@sveltejs/adapter-static@3` (si vous l'utilisez)
- `@sveltejs/vite-plugin-svelte@3` (ceci est maintenant nécessaire comme `peerDependency` de SvelteKit — alors qu'elle était directement importé auparavant)
- `@sveltejs/adapter-cloudflare@3` (si vous utilisez ces adaptateurs)
- `@sveltejs/adapter-cloudflare-workers@2`
- `@sveltejs/adapter-netlify@3`
- `@sveltejs/adapter-node@2`
- `@sveltejs/adapter-static@3`
- `@sveltejs/adapter-vercel@4`


`svelte-migrate` va mettre à jour votre `package.json` pour vous.

Dans le cadre de la mise à jour de TypeScript, le fichier `tsconfig.json` généré (celui à partir duquel votre `tsconfig.json` s'étend) utilise maintenant `"moduleResolution" : "bundler"` (ce qui est recommandé par l'équipe TypeScript, car il résout correctement les types provenant de paquets avec une carte `exports` dans `package.json`) et `verbatimModuleSyntax` (qui remplace les drapeaux existants `importsNotUsedAsValues` et `preserveValueImports` - si vous les avez dans votre `tsconfig.json`, supprimez-les. `svelte-migrate` le fera pour vous).
