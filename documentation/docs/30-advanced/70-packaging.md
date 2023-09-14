---
title: Packaging
---

Vous pouvez utiliser SvelteKit pour construire aussi bien des applications que des librairies de composants, en utilisant le paquet `@sveltejs/package` (`npm create svelte` a une option pour le mettre en place pour vous).

Lorsque vous créez une _application_, le contenu de `src/routes` correspond à ce que vous affichez au public ; le dossier [`src/lib`](modules#$lib) contient la libraire interne de votre application.

Une _librairie de composants_ a exactement la même structure qu'une application SvelteKit, sauf que c'est le dossier `src/lib` qui sera consommé par le public, et votre `package.json` sert à publier le paquet. Le dossier `src/routes` peut être une documentation ou un site de démo qui accompagne la librairie, ou bien simplement un bac à sable que vous utilisez pendant vos développements.

Exécuter la commande `svelte-package` de `@sveltejs/package` va prendre le contenu de `src/lib` et générer un dossier `dist` (qui peut être [configuré](#options)) contenant les choses suivantes :

- Tous les fichiers dans `src/lib`. Les composants Svelte seront préprocessés, les fichiers TypeScript seront transpilés en fichiers JavaScript.
- Les définitions de type (fichiers `.d.ts`) qui sont générés pour les fichiers Svelte, JavaScript et TypeScript, ce qui nécessite que vous ayez installé `typescript >= 4.0.0`. Les définitions de type sont placées au même endroit que le code associé, tandis que les fichiers `.d.ts` que vous auriez vous-même écrits sont copiés tels quels. Vous pouvez désactiver cette [génération de types](#options), mais nous vous recommandons fortement de ne pas le faire – des personnes se servant de votre librairie pourraient utiliser TypeScript, et auraient ainsi besoin de ces fichiers.

> `@sveltejs/package` version 1 génèrait un fichier `package.json`. Ce n'est plus le cas actuellement, nous utilisons à la place le fichier `package.json` de votre projet, et nous le validons. Si vous êtes toujours sur la version 1, référez-vous à [cette PR](https://github.com/sveltejs/kit/pull/8922) pour obtenir des instructions de migration.

## Anatomie d'un fichier `package.json`

Puisque vous développez une librairie pour le public, le contenu de votre fichier `package.json` devient très important. À travers lui, vous configurez les points d'entrée de votre paquet, quels fichiers sont publiés sur NPM, et quelles dépendances votre librairie possède. Voyons ensemble les propriétés les plus importantes une par une.

### `name`

Le nom de votre paquet. Il permet aux personnes voulant utiliser votre librairie de l'installer en utilisant ce nom. De plus, votre libraire sera visible sur la page `https://npmjs.com/package/<name>`.

```json
{
	"name": "votre-librarie"
}
```

Plus d'infos [ici](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name) (en anglais).

### `license`

Chaque paquet doit avoir une propriété de licence afin que les gens puissent savoir comment ils peuvent s'en servir. Une licence très populaire mais aussi très permissive en termes de distribution et de réutilisation sans obligations est la licence `MIT`.

```json
{
	"license": "MIT"
}
```

Plus d'infos [ici](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#license) (en anglais). Notez que vous devriez également inclure un fichier `LICENSE` dans votre paquet.

### `files`

Ceci dit à NPM quels fichiers seront inclus dans le paquet et envoyés sur NPM. Ce champ doit contenir le nom de votre dossier généré (`dist` par défaut). Vos fichiers `package.json`, `README` et `LICENSE` seront toujours inclus, vous n'avez donc pas besoin de les préciser.

```json
{
	"files": ["dist"]
}
```

Pour exclure d'éventuels fichiers non nécessaires (comme les fichiers de tests unitaires, ou des modules qui ne sont importés que par `src/routes`, etc), vous pouvez les ajouter dans un fichier `.npmignore`. Ceci permet de créer des paquets plus légers et plus rapides à installer.

Plus d'infos [ici](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#files) (en anglais).

### `exports`

La propriété `exports` contient les points d'entrée du paquet. Si vous initialisez un nouveau projet de librairie  avec `npm create svelte@latest`, cette propriété est définie a un unique export, la racine du paquet :

```json
{
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"svelte": "./dist/index.js"
		}
	}
}
```

Cela indique aux <span class="vo">[bundlers](PUBLIC_SVELTE_SITE_URL/docs/development#bundler-packager)</span> et autres outillages que votre paquet n'a qu'un seul point d'entrée, la racine, et que tout le reste doit être importé via ce point d'entrée, de cette manière :

```js
// @errors: 2307
import { Something } from 'your-library';
```

Les propriétés `types` et `svelte` sont des [conditions d'export](https://nodejs.org/api/packages.html#conditional-exports). Elles indiquent à l'outillage quel fichier importer lorsqu'il détermine l'import `votre-librairie` :

- TypeScript voit la condition `types`, et cherche le fichier de définitions de types. Si vous ne publiez pas de définitions de types, supprimez cette condition.
- Les outils dédiés à Svelte voient la condition `svelte` et en déduisent qu'il s'agit d'une librairie de composants. Si vous publiez une librairie qui n'exporte pas de composants Svelte et pourrait également fonctionner dans des projets non-Svelte (comme par exemple une librairie de <span class="vo">[store](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#store)</span> Svelte), vous pouvez remplacer cette condition par `default`.

> Les versions antérieures de `@sveltejs/package` incluaient également un export `package.json`. Celui-ci ne fait plus partie du <span class="vo">[template](PUBLIC_SVELTE_SITE_URL/docs/development#template)</span> car les outillages sont maintenant prévus pour fonctionner même si `package.json` n'est pas explicitement exporté.

Vous pouvez ajuster `exports` selon vos besoins et fournir plus de points d'entrée. Par exemple, si à la place d'un fichier `src/lib/index.js` qui réexporte des composants vous souhaitez directement exposer un composant `src/lib/Foo.svelte`, vous pourriez avoir la propriété `exports` (aussi appelée "dictionnaire d'exports") suivante...

```json
{
	"exports": {
		"./Foo.svelte": {
			"types": "./dist/Foo.svelte.d.ts",
			"svelte": "./dist/Foo.svelte"
		}
	}
}
```

...et quelqu'un qui utiliserait votre librairie pourrait importer le composant de cette manière :

```js
// @filename: ambient.d.ts
declare module 'votre-librairie/Foo.svelte';

// @filename: index.js
// ---cut---
import Foo from 'votre-librairie/Foo.svelte';
```

> Ayez conscience que faire cela implique un soin particulier si vous fournissez des définitions de types. Plus d'infos sur ce problème [ici](#typescript).

En général, chaque propriété du dictionnaire d'exports est le chemin qu'un utilisateur ou utilisatrice doit utiliser pour importer quelque chose depuis votre paquet, et la valeur est le chemin vers le fichier qui sera importé ou un dictionnaire de conditions d'exports qui lui-même contient ces chemins de fichiers.

Plus d'infos sur les `exports` [ici](https://nodejs.org/docs/latest-v18.x/api/packages.html#package-entry-points) (en anglais).

### `svelte`

La propriété `svelte` est une ancienne option utilisée pour permettre aux outillages de reconnaître les librairies de composants Svelte. Elle n'est plus nécessaire si vous utilisez la [condition d'export](#anatomie-d-un-fichier-package-json-exports) `svelte`, mais nous la gardons disponible pour rester compatible avec des outillages qui ne seraient pas à jour et ne connaitraient pas encore les conditions d'export. Cette propriété doit pointer vers votre point d'entrée racine.

```json
{
	"svelte": "./dist/index.js"
}
```

## TypeScript

Vous devriez embarquer les définitions de type de votre librairie même si elle n'utilise pas TypeScript, pour permettre aux gens d'utiliser la fonctionnalité <span class='vo'>[intellisense](PUBLIC_SVELTE_SITE_URL/docs/development#intellisense)</span> lorsqu'ils ou elles consomment votre librairie. `@sveltejs/package` rend le processus de génération des types invisible pour vous. Par défaut, lorsque vous compilez votre librairie, les définitions de type sont auto-générées pour les fichiers JavaScript, TypeScript et Svelte. Vous avez uniquement besoin de vous assurer que la condition `types` dans le [dictionnaire d'exports](#anatomie-d-un-fichier-package-json-exports) pointe vers les bons fichiers. Lorsque vous initialisez un projet de librairie via `npm create svelte@latest`, ceci est fait automatiquement pour l'export racine.

Si toutefois vous avez d'autres exports que l'export racine – par exemple si vous souhaitez fournir un import `votre-librairie/foo` – vous devez faire particulièrement attention pour fournir leurs définitions de types. Malheureusement, TypeScript ne va _pas_ résoudre par défaut la condition `types` pour un export comme `{ "./foo": { "types": "./dist/foo.d.ts", ... }}`. À la place, il va chercher un fichier `foo.d.ts` relatif à la racine de votre librairie (c'est-à-dire `votre-librairie/foo.d.ts` plutôt que `votre-librairie/dist/foo.d.ts`). Pour corriger cela, vous avez deux options :

La première option est d'obliger les gens qui utilisent votre librairie à définir l'option `moduleResolution` à `bundler` dans leur fichier `tsconfig.json` (ou `jsconfig.json`) (option disponible depuis TypeScript 5, et fortement recommandée), `node16` ou `nodenext`. Cela indique à TypeScript d'aller chercher dans le dictionnaire d'exports pour résoudre les types correctement.

La deuxième option est d'utiliser la fonctionnalité `typesVersions` de TypeScript pour retrouver les types. C'est une propriété du fichier `package.json` que TypeScript utilise pour retrouver les définitions de types en fonction de la version de TypeScript, et qui contient également un dictionnaire de chemins. Nous nous servons de ce dictionnaire pour obtenir ce que nous souhaitons. Pour l'exemple d'export `foo` ci-dessus, la valeur de `typesVersions` correspondante ressemble à ça :

```json
{
	"exports": {
		"./foo": {
			"types": "./dist/foo.d.ts",
			"svelte": "./dist/foo.js"
		}
	},
	"typesVersions": {
		">4.0": {
			"foo": ["./dist/foo.d.ts"]
		}
	}
}
```

La valeur `>4.0` indique à TypeScript d'utiliser le dictionnaire associé si la version de TypeScript est supérieure à 4 (ce qui devrait être toujours vrai en pratique). Le dictionnaire associé précise à TypeScript que les types de `votre-librairie/foo` se trouvent dans le fichier `./dist/foo.d.ts`, ce qui réplique la condition `exports`. Vous avez également à votre disposition la valeur `*` comme joker pour rendre disponibles plusieurs définitions de types à la fois sans avoir besoin de vous répéter. Notez que si vous choisissez d'utiliser `typesVersions`, vous devez y déclarer tous vos imports de types, en incluant ceux de l'import racine (défini en tant que `"index.d.ts": [...]`).

Plus d'informations sur cette fonctionnalité [ici](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions) (en anglais).

## Bonnes pratiques

Nous recommandons d'éviter d'utiliser des [modules spécifiques à SvelteKit](modules) comme `$app` dans votre librairie à moins que celle-ci soit uniquement conçue être utilisée pour des projets SvelteKit. Par exemple, plutôt que d'utiliser `import { browser } from '$app/environment'`, vous pourriez utiliser `import { BROWSER } from 'esm-env'` ([voir la documentation de `esm-env`](https://github.com/benmccann/esm-env) (en anglais)). Vous pouvez peut-être également fournir l'URL courante ou une action de navigation en tant que <span class="vo">[prop](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#prop)</span> plutôt que de dépendre directement de `$app/stores`, `$app/navigation`, etc. Écrire votre librairie de façon plus générique vous permettra également de mettre en place plus facilement des outils de test, des sites de démos, ou autres.

Assurez-vous d'ajouter vos [aliases](configuration#alias) via le fichier `svelte.config.js` (et non `vite.config.js` ou `tsconfig.json`), afin qu'ils soient traités par `svelte-package`.

Vous devriez réfléchir avec soin pour décider si les changements que vous apportez à votre librairie sont une correction de <span class="vo">[bug](PUBLIC_SVELTE_SITE_URL/docs/development#bug)</span>, une nouvelle fonctionnalité, ou un changement majeur qui peut potentiellement casser des choses, et mettre à jour la version de votre paquet en fonction. Notez que si vous supprimez de votre librairie un chemin de la propriété `exports` ou toute condition d'export qui s'y trouve, ceci devrait être considéré comme un changement majeur.

```diff
{
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
// changer `svelte` en `default` est un changement majeur :
-			"svelte": "./dist/index.js"
+			"default": "./dist/index.js"
		},
// supprimer ceci est un changement majeur :
-		"./foo": {
-			"types": "./dist/foo.d.ts",
-			"svelte": "./dist/foo.js",
-			"default": "./dist/foo.js"
-		},
// ajouter ceci n'est pas trop impactant :
+		"./bar": {
+			"types": "./dist/bar.d.ts",
+			"svelte": "./dist/bar.js",
+			"default": "./dist/bar.js"
+		}
	}
}
```

## Options

La commande `svelte-package` accepte les options suivantes :

- `-w`/`--watch` — écoute les changements sur les fichiers du dossier `src/lib` et recompile le projet
- `-i`/`--input` — le dossier d'entrée contenant tous les fichiers de votre paquet. Vaut par défaut `src/lib`
- `-o`/`--o` — le dossier de sortie où les fichiers compilés sont écrits. La propriété `exports` de votre fichier `package.json` doit pointer vers des fichiers dans ce dossier, et le tableau `files` doit inclure ce dossier. Vaut par défaut `dist`
- `-t`/`--types` — définit si oui ou non les définitions de types seront générées (les fichiers `.d.ts`). Nous recommandons fortement de l'activer car cela participe à l'amélioration de la qualité de l'écosystème. Vaut par défaut `true`

## Publier votre paquet

Pour publier le paquet généré :

```sh
npm publish
```

## Mises en garde

Tout import d'un fichier relatif doit être entièrement précisé, en respectant l'algorithme ESM de Node. Cela implique que pour un fichier tel que `src/lib/something/index.js`, vous devez inclure le nom du fichier ainsi que son extension :

```diff
-import { something } from './something';
+import { something } from './something/index.js';
```

Si vous utilisez TypeScript, vous devez importer les fichiers `.ts` de la même manière, mais en utilisant l'extension `.js`, et _non_ l'extension `.ts`. (Cette contrainte vient d'une décision de design de TypeScript sur laquelle nous n'avons pas de contrôle.) Définir `"moduleResolution": "NodeNext"` dans votre fichier `tsconfig.json` ou `jsconfig.json` peut vous aider sur ce point.

Tous les fichiers à l'exception des fichiers Svelte (préprocessés) et TypeScript (transpilés vers JavaScript) sont copiés dans votre paquet tels quels.
