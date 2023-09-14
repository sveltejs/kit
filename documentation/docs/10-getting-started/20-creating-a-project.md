---
title: Créer un projet
---

La façon la plus simple de commencer une application SvelteKit est d'utiliser `npm create` :

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

La première commande va générer un nouveau projet dans le dossier `my-app`, en vous proposant d'utiliser de l'outillage de base comme TypeScript.
Vous trouverez des indications pour installer d'autres outils sur la page d'[intégrations](./integrations). Les autres commandes installent ensuite les dépendances du projet, et lancent un serveur de développement sur [localhost:5173](http://localhost:5173).

SvelteKit a deux principes de base :

- Chaque page de votre application est un composant [Svelte](PUBLIC_SVELTE_SITE_URL)
- Vous créez des pages en ajoutant des fichiers dans le dossier `src/routes` de votre projet. Ces pages seront d'abord rendues sur le serveur afin que la première visite d'un utilisateur ou d'une utilisatrice soit aussi rapide que possible, puis une application côté client prend le relais

Essayez de modifier les fichiers pour vous faire une idée de comment les choses fonctionnent.

## Éditeurs

Il est recommandé d'utiliser [Visual Studio Code (aka VS Code)](https://code.visualstudio.com/download) avec [l'extension Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode), mais [d'autres éditeurs sont également supportés](https://sveltesociety.dev/resources#editor-support).

