---
title: Performance
---

SvelteKit fait beaucoup de travail pour rendre vos applications aussi performantes que possible :

- la division du code ([code-splitting](PUBLIC_SVELTE_SITE_URL/docs/web#code-splitting)), afin que seul le code dont vous avez besoin pour la page en cours soit chargé
- le préchargement des ressources, afin d'éviter les "cascades" (de fichiers demandant d'autres fichiers)
- le hachage des fichiers, pour que vos ressources puissent être mises en cache pour toujours
- la fusion des requêtes, de sorte que les données extraites de fonctions `load` distinctes du serveur soient regroupées en une seule requête HTTP
- le chargement parallèle, de sorte que des fonctions `load` distinctes récupèrent des données simultanément.
- Inlining des données, de sorte que les requêtes faites avec `fetch` pendant le rendu du serveur peuvent être rejouées dans le navigateur sans émettre une nouvelle requête.
- L'invalidation conservatrice, afin que les fonctions `load` ne soient réexécutées qu'en cas de nécessité.
- Pré-rendu (configurable par route, si nécessaire) pour que les pages sans données dynamiques puissent être servies instantanément.
- Le préchargement des liens, de sorte que les données et le code nécessaires à la navigation côté client soient anticipés.

Néanmoins, nous ne pouvons pas (encore) éliminer toutes les sources de lenteur. Pour obtenir des performances maximales, vous devez tenir compte des conseils suivants.

## Diagnostiquer les problèmes

Les outils de Google [PageSpeed Insights] (https://pagespeed.web.dev/) et (pour une analyse plus poussée) [WebPageTest] (https://www.webpagetest.org/) sont d'excellents moyens de comprendre les caractéristiques de performance d'un site déjà déployé sur l'internet.

Votre navigateur comprend également des outils de développement utiles pour analyser votre site, qu'il soit déployé ou exécuté localement :

* Chrome - [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview#devtools), [Network](https://developer.chrome.com/docs/devtools/network), et [Performance](https://developer.chrome.com/docs/devtools/performance) dans les devtools
* Edge - [Lighthouse](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/lighthouse/lighthouse-tool), [Network](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/network/), et [Performance](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/evaluate-performance/) dans les devtools
* Firefox - [Network](https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/) et [Performance](https://hacks.mozilla.org/2022/03/performance-tool-in-firefox-devtools-reloaded/) dans les devtools
* Safari - [améliorer les performances de votre page web](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/Web_Inspector_Tutorial/EnhancingyourWebpagesPerformance/EnhancingyourWebpagesPerformance.html)

Notez que votre site fonctionnant localement en mode `dev` aura un comportement différent de celui de votre application de production, vous devriez donc faire des tests de performance en mode [preview](/docs/building-your-app#pr-visualiser-votre-application) après le [build](PUBLIC_SVELTE_SITE_URL/docs/development#build).

### Instrumenter

Si vous voyez dans l'onglet réseau de votre navigateur qu'un appel d'API prend beaucoup de temps et que vous aimeriez comprendre pourquoi, vous pouvez envisager d'instrumenter votre backend avec un outil comme [OpenTelemetry](https://opentelemetry.io/) (en anglais) ou [Server-Timing headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) (en anglais).

## Optimisation des ressources

### Images

Réduire la taille des images est souvent l'un des changements les plus importants que vous puissiez faire pour améliorer les performances d'un site. Svelte fournit le paquet `@sveltejs/enhanced-image`, détaillé sur la page [images](images), pour faciliter cette opération. De plus, Lighthouse est utile pour identifier les problèmes les plus importants.

### Videos

Les fichiers vidéo peuvent être très volumineux, il faut donc veiller à ce qu'ils soient optimisés :

- Compressez les vidéos avec des outils tels que [Handbrake] (https://handbrake.fr/). Envisagez de convertir les vidéos dans des formats adaptés au web tels que `.webm` ou `.mp4`.
- Vous pouvez [lazy-loader les vidéos](https://web.dev/articles/lazy-loading-video) situées sous la ligne de flottaison avec `preload="none"` (mais notez que cela ralentira la lecture lorsque l'utilisateur _lance_ la vidéo).
- Supprimez la piste audio des vidéos muettes à l'aide d'un outil comme [FFmpeg](https://ffmpeg.org/).

### Polices

SvelteKit précharge automatiquement les fichiers `.js` et `.css` critiques lorsque l'utilisateur visite une page, mais il ne précharge pas les polices par défaut, car cela peut entraîner le téléchargement de fichiers inutiles (tels que les graisses de police référencés par votre CSS mais qui ne sont pas utilisés sur la page actuelle). Cela dit, le préchargement correct des polices peut faire une grande différence dans la rapidité de votre site. Dans votre hook [`handle`](hooks#hooks-de-serveur), vous pouvez appeler `resolve` avec un filtre `preload` qui inclut vos polices.

Vous pouvez réduire la taille des fichiers de polices de caractères en [sous-ensembles] (https://web.dev/learn/performance/optimize-web-fonts#subset_your_web_fonts) vos polices de caractères.

## Réduction de la taille du code

### version de Svelte

Nous recommandons d'utiliser la dernière version de Svelte. Svelte 4 est plus petit et plus rapide que Svelte 3. (La [la version de Svelte 5] (https://svelte-5-preview.vercel.app/) est encore plus petite et plus rapide, mais nous ne vous recommandons pas de passer à cette version tant qu'elle n'est pas prête pour la production).

### Paquets

[`rollup-plugin-visualizer`] (https://www.npmjs.com/package/rollup-plugin-visualizer) peut être utile pour identifier les paquets qui contribuent le plus à la taille de votre site. Vous pouvez également trouver du code à supprimer en inspectant manuellement la sortie de la compilation (utilisez `build : { minify : false }` dans votre [Vite config](https://vitejs.dev/config/build-options.html#build-minify) pour rendre la sortie lisible, mais n'oubliez pas de l'annuler avant de déployer votre application), ou via l'onglet réseau des outils de développement de votre navigateur.

### Scripts externes

Essayez de minimiser le nombre de scripts tiers exécutés dans le navigateur. Par exemple, au lieu d'utiliser des analyses basées sur JavaScript, envisagez d'utiliser des implémentations côté serveur, telles que celles proposées par de nombreuses plateformes dotées d'adaptateurs SvelteKit, notamment [Cloudflare](https://www.cloudflare.com/web-analytics/), [Netlify](https://docs.netlify.com/monitor-sites/site-analytics/) et [Vercel](https://vercel.com/docs/analytics).

To run third party scripts in a web worker (which avoids blocking the main thread), use [Partytown's SvelteKit integration](https://partytown.builder.io/sveltekit).

Pour exécuter des scripts tiers dans un [web worker](PUBLIC_SVELTE_SITE_URL/docs/web#web-worker) (ce qui évite de bloquer le thread principal), utilisez [l'intégration SvelteKit de Partytown] (https://partytown.builder.io/sveltekit) (en anglais).

### Chargement sélectif

Le code importé avec les déclarations statiques `import` sera automatiquement regroupé avec le reste de votre page. S'il y a un morceau de code dont vous n'avez besoin que lorsqu'une certaine condition est remplie, utilisez plutôt la forme dynamique `import(...)`.

## Navigation

### Préchargement

Vous pouvez accélérer les navigations côté client en préchargeant le code et les données nécessaires, en utilisant [les options de lien](link-options). Ceci est configuré par défaut sur l'élément `<body>` lorsque vous créez une nouvelle application SvelteKit.

### Données non essentielles

Pour les données à chargement lent qui ne sont pas nécessaires immédiatement, l'objet retourné par votre fonction `load` peut contenir des promesses plutôt que les données elles-mêmes. Pour les fonctions `load` du serveur, cela fera que les données seront [streamées] (load#streaming-with-promises) après la navigation (ou le chargement initial de la page).

### Prévenir les cascades

L'un des plus grands facteurs de dégradation des performances est ce que l'on appelle une "cascade", c'est-à-dire une série de requêtes effectuées de manière séquentielle. Cela peut se produire sur le serveur ou dans le navigateur.

- Des cascades de ressources peuvent se produire dans le navigateur lorsque votre HTML demande du JS qui demande du CSS qui demande une image de fond et une police web. SvelteKit résoudra en grande partie cette catégorie de problèmes pour vous en ajoutant des balises ou des en-têtes [`modulepreload`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/modulepreload), mais vous devriez consulter [l'onglet réseau dans votre devtools](#diagnostiquer-les-probl-mes) pour vérifier si des ressources supplémentaires doivent être pré-chargées. Faites particulièrement attention à cela si vous utilisez des [polices](#optimisation-des-ressources-polices) web, car elles doivent être gérées manuellement.
- Si une fonction `load` universelle effectue un appel API pour récupérer l'utilisateur actuel, puis utilise les détails de cette réponse pour récupérer une liste d'éléments sauvegardés, et enfin utilise _cette_ réponse pour récupérer les détails de chaque élément, le navigateur finira par effectuer plusieurs requêtes séquentielles. Ceci est fatal pour les performances, en particulier pour les utilisateurs qui sont physiquement situés loin de votre backend. Évitez ce problème en utilisant [les fonctions `load` de serveur] (/docs/load#universal-vs-server) lorsque c'est possible.
- Les fonctions `load` de serveur ne sont pas non plus à l'abri des cascades (bien qu'elles soient beaucoup moins coûteuses puisqu'elles impliquent rarement des allers-retours avec une latence élevée). Par exemple, si vous interrogez une base de données pour obtenir l'utilisateur actuel et que vous utilisez ensuite ces données pour effectuer une seconde requête pour une liste d'éléments sauvegardés, il sera généralement plus performant d'effectuer une seule requête avec une jointure de base de données.

## Hébergement

Votre frontend devrait être situé dans le même data center que votre backend afin de minimiser la latence. Pour les sites qui n'ont pas de backend, de nombreux adaptateurs SvelteKit supportent le déploiement vers les services _edge_, ce qui signifie traiter les requêtes de chaque utilisateur à partir d'un serveur proche. Cela peut considérablement réduire les temps de chargement. Certains adaptateurs prennent même en charge [la configuration du déploiement par itinéraire] (https://kit.svelte.dev/docs/page-options#config). Vous devriez également envisager de servir des images à partir d'un CDN (qui sont généralement des réseaux proches) - les hôtes de nombreux adaptateurs SvelteKit le feront automatiquement.

Assurez-vous que votre hôte utilise HTTP/2 ou une version plus récente. Le découpage du code de Vite crée de nombreux petits fichiers pour améliorer la mise en cache, ce qui se traduit par d'excellentes performances, mais cela suppose que vos fichiers puissent être chargés en parallèle avec HTTP/2.

## Lecture complémentaire

Pour l'essentiel, la construction d'une application SvelteKit performante est identique à la construction de n'importe quelle application web performante. Vous devriez être en mesure d'appliquer les informations des ressources générales sur les performance telles que [les Core Web Vitals] (https://web.dev/explore/learn-core-web-vitals) à toute expérience web que vous construisez.
