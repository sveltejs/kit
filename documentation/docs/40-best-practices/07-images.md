---
title: Images
---

Les images peuvent avoir un impact conséquent sur la performance de votre application. Pour réduire cet impact, vous devriez optimiser cette performance en faisant ce qui suit :

- générer des formats optimisés d'images, comme `.avif` ou `.webp`
- créer des tailles différentes pour les différents types d'écran
- vous assurer que les fichiers statiques sont mis en cache de manière efficace

Faire tout ceci à la main est fastidieux. De nombreuses techniques sont à votre disposition, en fonction de vos besoins et de vos préférences.

## Gestion intégrée par Vite

[Vite traite automatiquement les fichiers statiques importés](https://vitejs.dev/guide/assets.html) pour améliorer la performance. Ceci inclut les fichiers référencés via la fonction CSS `url()`. Les <span class='vo'>[hashs](PUBLIC_SVELTE_SITE_URL/docs/development#hash)</span> sont ajoutés aux noms de fichier afin qu'ils soient mis en cache, et les fichiers plus petits que `assetsInlineLimit` sont inlinés. La gestion de fichiers statiques de Vite est souvent utilisée pour les images, mais est aussi utile pour les vidéos, l'audio, etc.

```svelte
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

## @sveltejs/enhanced-img

> **AVERTISSEMENT**: Le paquet `@sveltejs/enhanced-img` est expérimental. Il utilise une version pre-1.0 et peut introduire des changements critiques avec chaque nouvelle version mineure.

`@sveltejs/enhanced-img` se rajoute à la gestion des fichiers statiques de Vite. Ce module offre un traitement des images clé-en-main permettant de servir des formats de fichiers comme `avif` ou `webp`, d'automatiquement définir des tailles d'image `width` et `height` intrinsèques pour éviter le phénomène de [décalage de layout](https://web.dev/articles/cls), crée des images de diverses tailles pour différents appareils, et supprime les données EXIF pour protéger la vie privée. Ce module fonctionne dans tout projet basé sur Vite, incluant notamment les projets SvelteKit, mais aussi d'autres types de projet.

### Installation

Installez le paquet :

```bash
npm install --save-dev @sveltejs/enhanced-img
```

Modifiez `vite.config.js`:

```diff
import { sveltekit } from '@sveltejs/kit/vite';
+import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
+		enhancedImages(),
		sveltekit()
	]
});
```

### Utilisation de base

Dans vos composants `.svelte`, utilisez `<enhanced:img>` plutôt que `<img>` et référencez le fichier d'image avec un [chemin d'import statique de Vite](https://vitejs.dev/guide/assets.html#static-asset-handling) :

```svelte
<enhanced:img src="./chemin/vers/votre/image.jpg" alt="Un texte descriptif" />
```

À la compilation, votre balise `<enhanced:img>` sera remplacée par une `<img>` entourée d'une `<picture>` fournissant plusieurs types d'images et de tailles. Il est uniquement possible de réduire les tailles d'images sans perdre en qualité, ce qui signifie que vous devriez fournir la plus haute résolution d'image dont vous avez besoin – les résolutions plus petites seront générées pour les différents types d'appareils qui pourraient requêter une image.

Nous conseillons de fournir votre image à une résolution 2x pour les moniteurs HiDPI (aussi appelé écran Retina). `<enhanced:img>` se chargera automatiquement de servir des versions plus légères aux appareils plus petits.

Si vous souhaitez ajouter des styles à votre `<enhanced:img>`, vous devriez ajouter une `class`, puis la cibler avec un sélecteur approprié.

### Choisir une image dynamiquement

Vous pouvez aussi importer manuellement un fichier d'image et le passer à une balise `<enhanced:img>`. Ceci est utile lorsque vous avez une collection d'images statiques et souhaitez en choisir une dynamiquement, ou bien si vous souhaitez [itérer sur les images](https://github.com/sveltejs/kit/blob/main/sites/kit.svelte.dev/src/routes/home/Showcase.svelte). Dans ce cas, vous avez besoin de mettre à jour à la fois la déclaration `import` et l'élément `<img>` comme montré ci-dessous pour indiquer que vous souhaitez les traiter.

```svelte
<script>
	import MyImage from './path/to/your/image.jpg?enhanced';
</script>

<enhanced:img src={MyImage} alt="Un texte descriptif" />
```

Vous pouvez aussi utiliser l'[`import.meta.glob` de Vite](https://vitejs.dev/guide/features.html#glob-import). Notez que vous aurez besoin de préciser `enhanced` via une [query personnalisée](https://vitejs.dev/guide/features.html#custom-queries) :

```js
const pictures = import.meta.glob(
	'/path/to/assets/*.{avif,gif,heif,jpeg,jpg,png,tiff,webp}',
	{
		query: {
			enhanced: true
		}
	}
);
```

### Dimensions intrinsèques

`width` et `height` sont optionnelles puisqu'elles peuvent être inférées depuis l'image source et sont automatiquement ajoutées lorsque la balise `<enhanced:img>` est traitée. Avec ces attributs, le navigateur peut réserver l'espace nécessaire, évitant les [décalages de layout](https://web.dev/articles/cls). Si vous souhaitez utiliser des `width` et `height` différentes, vous pouvez styliser l'image avec du CSS. Puisque le préprocesseur ajoute une `width` et `height` pour vous, si vous souhaitez qu'une de ces dimensions soit automatiquement calculée, vous devrez alors préciser ceci :

```svelte
<style>
	.hero-image img {
		width: var(--size);
		height: auto;
	}
</style>
```

### `srcset` et `sizes`

Si vous avez une grande image, comme une image principale ayant la largeur du design, vous pouvez préciser l'attribut `sizes` afin que des versions plus petites soient requêtées sur des appareils plus petits. Par exemple, si vous avez une image en 1280px, vous pourriez vouloir préciser quelque chose comme :

```svelte
<enhanced:img src="./image.png" sizes="min(1280px, 100vw)"/>
```

Si `sizes` est précisé, `<enhanced:img>` va générer des images plus petites pour les appareils plus petits, et remplir l'attribut `srcset`.

La plus petite image générée automatiquement aura une largeur de 540px. Si vous souhaitez des images plus petites ou souhaitez avoir des largeurs personnalisées, vous pouvez le faire en utilisant le paramètre de requête `w` :

```svelte
<enhanced:img
  src="./image.png?w=1280;640;400"
  sizes="(min-width:1920px) 1280px, (min-width:1080px) 640px, (min-width:768px) 400px"
/>
```

Si `sizes` n'est pas précisé, une image sera alors générée en format HiDPI/Retina et une résolution standard sera utilisée. L'image que vous fournissez devrait avoir une résolution 2x plus grande que celle que vous souhaitez afficher afin que le navigateur puisse afficher cette image sur les appareils avec un [`devicePixelRatio` élevé](https://developer.mozilla.org/fr/docs/Web/API/Window/devicePixelRatio).

### Transformations d'images

Par défaut, les images améliorées sont transformées pour être dans des formats optimisés. Cependant, vous pourriez vouloir appliquer d'autres transformations telles qu'un flou, une rotation, ou un aplatissement. Vous pouvez appliquer des transformations par image en ajoutant une chaîne de caractères de recherche :

```svelte
<enhanced:img src="./path/to/your/image.jpg?blur=15" alt="Un texte descriptif" />
```

[Voir le projet `imagetools` pour la liste complète des directives disponibles](https://github.com/JonasKruckenberg/imagetools/blob/main/docs/directives.md) (en anglais).

## Charger des images dynamiquement depuis un CDN

Dans certains cas, les images peuvent ne pas être accessibles au moment de la compilation – par exemple, elle peuvent se trouver au sein d'un système de gestion de contenu, ou ailleurs.

L'utilisation d'un <span class='vo'>[CDN](PUBLIC_SVELTE_SITE_URL/docs/web#cdn)</span> peut vous permettre d'optimiser ces images dynamiquement, et fournit plus de flexibilité en ce qui concerne les tailles, mais cela implique une mise en place spécifique ainsi que des surcoûts à l'utilisation. En fonction de votre stratégie de mise en cache, le navigateur peut ne pas pouvoir utiliser la copie du fichier mis en cache tant qu'une [réponse 304](https://developer.mozilla.org/fr/docs/Web/HTTP/Status/304) n'est pas reçue du CDN. Construire du HTML ciblant des CDNs peut conduire à du HTML légèrement plus léger et plus simple car les CDNs peuvent servir le format de fichier approprié pour une balise `<img>` en fonction du <span class='vo'>[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `User-Agent`, tandis que les optimisations de compilation doivent produire des balises `<picture>` avec plusieurs sources. Enfin, certains CDNs peuvent générer des images à la demande, ce qui peut avoir un impact négatif sur la performance de certains sites ayant peu de trafic et des images qui changent souvent. Nous n'offrons pas actuellement d'outils pour la transformation dynamique d'images, mais nous pourrions le faire dans le futur.

Les <span class='vo'>[CDN](PUBLIC_SVELTE_SITE_URL/docs/web#cdn)</span> peuvent être en général utilisés sans avoir besoin d'une librairie. Cependant, il existe plusieurs librairies compatibles avec Svelte qui simplifient l'usage de CDN. [`@unpic/svelte`](https://unpic.pics/img/svelte/) est une librairie CDN agnostique compatible avec un grand nombre de fournisseurs. Il existe également des CDN spécifiques comme [Cloudinary](https://svelte.cloudinary.dev/) qui sont directement compatibles avec Svelte. Enfin, certains gestionnaires de contenus (<span class='vo'>[CMS](PUBLIC_SVELTE_SITE_URL/docs/web/cms)</span>) compatibles avec Svelte (comme [Contentful](https://www.contentful.com/sveltekit-starter-guide/), [Storyblok](https://github.com/storyblok/storyblok-svelte), et [Contentstack](https://www.contentstack.com/docs/developers/sample-apps/build-a-starter-website-with-sveltekit-and-contentstack)) ont une gestion des images intégrée.

## Bonnes pratiques

- Pour chaque type d'image, utilisez la solution appropriée parmi celles présentées ci-dessus. Vous pouvez mélanger les trois solutions dans un même projet. Par exemple, vous pouvez utiliser la gestion intégrée de Vite pour fournir des images pour les balises `<meta>`, afficher des images sur votre page d'accueil avec `@sveltejs/enhanced-img`, et afficher le contenu fourni par les utilisateurs et utilisatrices avec une approche dynamique.
- Envisagez de servir toutes les images via un <span class='vo'>[CDN](PUBLIC_SVELTE_SITE_URL/docs/web/cdn)</span> quelque soit le type d'optimisation que vous choisissez. Les CDNs permettent de réduire la latence en distribuant globalement des copies de vos fichiers statiques.
- Vos images d'origine devraient être de bonne qualité/résolution, et devraient avoir une largeur 2x plus grande que celle que vous souhaitez afficher pour pouvoir être affichées sur des appareils HiDPI. Le traitement d'image peut réduire les tailles d'image pour économiser de la bande passante lorsque vous servez des écran plus petits, mais cela serait une perte sèche de bande passante d'inventer des pixels pour créer artificiellement des images plus grandes.
- Pour les images qui sont bien plus larges que la largeur des appareils mobiles (en général 400px), par exemple des images prenant toute la largeur du design, préciser `sizes` afin que des images plus petites puissent être servies sur des appareils plus petits.
- Choisissez une image par page comme étant la plus grande/importante, et donnez-lui l'attribut `priority` afin qu'elle se charge plus vite. Ceci permet d'augmenter les scores de performance web (particulièrement le "Largest Contentful Paint" ou LCP).
- Donnez à vos images un conteneur ou du style permettant qu'elles ne soient pas contraintes et ne "saute" pas. `width` et `height` aident le navigateur à réserver la place pendant que l'image est en train de se charger. `@sveltejs/enhanced-img` ajoute une `width` et `height` pour vous.
- Fournissez toujours un texte alternatif `alt` de qualité. Le compilateur Svelte vous avertira si vous l'oubliez.
