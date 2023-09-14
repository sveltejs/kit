---
title: Glossaire
---

Le coeur de SvelteKit fournit un moteur de rendu hautement configurable. Cette section décrit certains des termes utilisés lorsque l'on parle de rendu. Une référence pour définir ces options est disponible dans la documentation ci-dessus.

## CSR

Le rendu côté client (_Client-side rendering_, ou CSR) est la génération du contenu de la page dans le navigateur web en utilisant JavaScript.

Dans une application SvelteKit, le rendu côté client est utilisé par défaut, mais vous pouvez le désactiver avec l'[option de page `csr = false`](page-options#csr).

## Hydratation

Les composants Svelte stockent de l'état et mettent à jour le <span class='vo'>[DOM](PUBLIC_SVELTE_SITE_URL/docs/web#dom)</span> lorsque l'état change. Lorsque l'on récupère des données durant le [SSR](#ssr), SvelteKit va par défaut stocker ces données et les transmettre au client avec le HTML généré sur le serveur. Les composants peuvent alors être initialisés sur le client avec ces données sans avoir à rappeler ces mêmes <span class='vo'>[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> d'<span class='vo'>[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span>. Svelte va alors vérifier que le DOM est dans l'état attendu et attacher des gestionnaires d'évènement dans un processus appelé _hydratation_. Une fois que les composants sont complètement hydratés, ils peuvent réagir aux changements qui affectent leurs propriétés comme n'importe quel composant Svelte nouvellement instancié.

Dans une application SvelteKit, les pages sont hydratées par défaut, mais vous pouvez désactiver JavaScript (ce qui désactive de fait l'hydratation) avec l'[option de page `csr = false`](page-options#csr).

## Prérendu

Le prérendu est le processus de calcul de tout le contenu d'une page au moment de la compilation puis de sauvegarde des fichiers HTML générés. Cette approche a les mêmes avantages que les pages générées par un rendu côté serveur traditionnel, mais évite que chaque visite de la page déclenche un recalcul de celle-ci, ce qui permet de supporter une augmentation du nombre de visites à moindre coût. La contrepartie est que le processus de compilation coûte plus cher en ressources, et le contenu ainsi généré ne peut être mis à jour que par une compilation et un déploiement d'une nouvelle version de l'application.

Toutes les pages ne peuvent pas être prérendues. La règle de base est : pour qu'un contenu puisse être prérendu, deux personnes visitant directement ce contenu doivent obtenir le même résultat du serveur, et la page ne doit pas contenir d'[actions de formulaire](form-actions). Notez que vous pouvez tout de même prérendre du contenu qui est chargé en fonction des paramètres de la page tant que tout le monde voit le même contenu prérendu.

Les pages prérendues ne sont pas limitées à du contenu statique. Vous pouvez construire des pages personnalisées si les données spécifiques à l'utilisateur ou l'utilisatrice sont chargées et rendues côté client. Ceci va souffrir des défauts de ne pas utiliser de [SSR](#ssr) pour ce contenu comme discuté plus haut.

Dans une application SvelteKit, vous pouvez contrôler le prérendu avec l'[option de page `prerender`](page-options#csr) et la [configuration `prerender`](configuration#prerender) du fichier `svelte.config.js`.

## Routing

Par défaut, lorsque vous naviguez vers une nouvelle page (en cliquant sur un lien ou en utilisant les boutons précédent/suivant du navigateur), SvelteKit intercepte la navigation avant qu'elle ne se produise et la traite lui-même plutôt que de laisser le navigateur envoyer une requête vers la page de destination. SvelteKit met ensuite à jour le contenu affiché sur le client en effectuant un rendu du composant correspondant à la nouvelle page, qui peut alors effectuer des appels vers les <span class='vo'>[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> d'<span class='vo'>[API](PUBLIC_SVELTE_SITE_URL/docs/development#api)</span> nécessaires. Ce processus de mise à jour de la page sur le client en réponse à une tentative de navigation est appelé _routing côté client_.

Dans une application SvelteKit, le routing côté client est utilisé par défaut, mais vous pouvez le désactiver avec [`data-sveltekit-reload`](link-options#data-sveltekit-reload).

## SPA

Une application n'ayant qu'une seule page (_Single Page Application_, ou SPA) est une application dans laquelle toutes les requêtes vers le serveur chargent un unique fichier HTML qui s'occupe ensuite de faire le rendu côté client du contenu demandé en fonction de l'URL requêtée. Toute la navigation est gérée côté client dans un processus appelé _routing côté client_, avec le contenu spécifique à la page mis à jour et les éléments de <span class='vo'>[layout](PUBLIC_SVELTE_SITE_URL/docs/development#layout)</span> communs restant en grande partie inchangés. Les SPAs ne fournissent pas de [SSR](#ssr), ce qui a les désavantages décrits plus haut. Cependant, certaines applications ne sont pas beaucoup impactées par ces problématiques, comme une application d'entreprise nécessitant de se connecter. Dans ce cas le référencement n'est pas vraiment important, et il est admis que les utilisateurs et utilisatrices de cette application y accèdent depuis un environnement cohérent.

SvelteKit vous permet de construire une application de type SPA en utilisant l'[adaptateur `adapter-static`](single-page-apps).

## SSG

La génération de site statique (_Static Site Generation_, ou SSG) est une stratégie consistant à prégénérer chaque page d'un site. SvelteKit n'a pas été conçu pour uniquement générer des sites statiques comme certains outils, et peut éventuellement être moins efficace pour prérendre un très grand nombre de pages que les outils conçus spécifiquement dans cette optique. Cependant, à l'inverse de la plupart des outils dédiés au SSG, SvelteKit permet de mélanger différents stratégies de rendu sur différentes pages. Un gros avantage à prérendre un site est que vous n'avez pas besoin de payer des serveurs pour qu'ils fassent du [SSR](#ssr). Une fois généré, le site peut être servi depuis des <span class='vo'>[CDNs](PUBLIC_SVELTE_SITE_URL/docs/web#cdn)</span>, impliquant une excellente performance du site sur l'indicateur "time to first byte". Ce modèle est généralement connu sous le nom de JAMstack.

Dans une application SvelteKit, vous pouvez générer un site statique en utilisant l'adaptateur [`adapter-static`](adapter-static) ou en configurant chaque page de sorte à ce qu'elle soit prérendue en utilisant l'[option de page `prerender`](page-options#prerender) ou l'[option de configuration `prerender`](configuration#prerender) dans le fichier `svelte.config.js`.

## SSR

Le rendu côté serveur (_Server-Side Rendering_, ou SSR) est une stratégie consistant à générer le contenu d'une page sur le serveur. SSR est en général la meilleure stratégie pour le référencement. Bien que certains moteurs de recherche soient capables d'indexer du contenu dynamiquement généré côté client, l'indexation est en souvent plus lente dans ce cas-là, ce qui pénalise le référencement. Le SSR a également tendance à améliorer la performance perçue et rend votre application accessible aux utilisateurs et utilisatrices qui n'ont pas réussi à charger JavaScript ou si celui-ci est désactivé (ce qui arrive [plus souvent qu'on ne le croit](https://kryogenix.org/code/browser/everyonehasjs.html)).

Dans une application SvelteKit, les pages sont rendues côté serveur par défaut. Vous pouvez désactiver le SSR en utilisant l'[option de page `ssr`](page-options#ssr).
