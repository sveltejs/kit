---
title: Service workers
---

Service workers act as proxy servers that handle network requests inside your app. This makes it possible to make your app work offline, but even if you don't need offline support (or can't realistically implement it because of the type of app you're building), it's often worth using service workers to speed up navigation by precaching your built JS and CSS.

In SvelteKit, if you have a `src/service-worker.js` file (or `src/service-worker.ts`, or `src/service-worker/index.js`, etc) it will be built with Vite and automatically registered. You can disable automatic registration if you need to register the service worker with your own logic (e.g. prompt user for update, configure periodic updates, use `workbox`, etc).

> You can change the location of your service worker and disable automatic registration in your [project configuration](/docs/configuration#files).

Inside the service worker you have access to the [`$service-worker` module](/docs/modules#$service-worker).

Because it needs to be bundled (since browsers don't yet support `import` in this context), and depends on the client-side app's build manifest, **service workers only work in the production build, not in development**. To test it locally, use [`svelte-kit preview`](/docs/cli#svelte-kit-preview).
