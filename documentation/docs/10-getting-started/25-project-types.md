---
title: Project types
---

SvelteKit offers configurable rendering, which allows you to build and deploy your project in several different ways. You can build all of the below types of applications and more with SvelteKit. Rendering settings are not mutually exclusive and you may choose the optimal manner with which to render different parts of your application.

If you don't have a particular way you'd like to build your application in mind, don't worry! The way your application is built, deployed, and rendered is controlled by which adapter you've chosen and a small amount of configuration and these can always be changed later.

The project structure and routing will be the same regardless of the project type that you choose. If you are building an application with no backend or where the backend is running in a difference service, you can simply skip over and ignore the parts of the docs talking about `server` files.

## Default hybrid rendered app

By default, when a user visits a site, SvelteKit will render the first page with server-side rendering and subsequent pages with client-side rendering. Using SSR for the initial render improves SEO and perceived performance of the initial page load. Client-side rendering then takes over and updates the page without having to rerender common components, which is typically faster and eliminates a flash when navigating between pages.

## Static site generator (SSG)

You can use SvelteKit as a static site generator (SSG) that fully prerenders your site with [`adapter-static`](adapter-static).

You may also use [the prerender option](page-options#prerender) to prerender only some pages and then choose a different adapter with which to dynamically server-render other pages.

## Single-page app (SPA)

You can [build single page apps (SPAs)](single-page-apps) with SvelteKit. As with all types of SvelteKit applications, you can write your backend in SvelteKit or [another language](#backend-in-another-language).

## Multi-page app (MPA)

Traditional applications that render each page view on the server — such as those written in languages other than JavaScript — are often referred to as multi-page apps. In SvelteKit you can remove all JavaScript on a page with [`csr = false`](page-options#csr), which will render subsequent links on the server, or you can use [`data-sveltekit-reload`](link-options#data-sveltekit-reload) to render specific links on the server.

## Backend in another language

If your backend is written in another language such as Go, Java, PHP, Rust, or .Net then there are a couple of ways that you can deploy your application. The most recommended way would be to deploy your SvelteKit frontend separately from your backend utilizing `adapter-node` or a serverless adapter. Some users prefer not to have a separate process to manage and decide to deploy their application as a [single page app (SPA)](single-page-apps) served by their backend server.

Also see [the FAQ about how to make calls to a separate backend](faq#How-do-I-use-X-with-SvelteKit-How-do-I-use-a-different-backend-API-server).

## Serverless app

SvelteKit apps are simple to run on serverless platforms. [The default zero config adapter](adapter-auto) will automatically run your app on a number of supported platforms. You can use [`adapter-vercel`](adapter-vercel), [`adapter-netlify`](adapter-netlify), or [`adapter-cloudflare`](adapter-cloudflare) to provide platform-specific configuration. And [community adapters](https://sveltesociety.dev/packages?category=sveltekit-adapters) allow you to deploy your application to almost any serverless environment.

## Your own server (VPS)

You can deploy to your own server using [`adapter-node`](adapter-node).

## Container (Docker, etc.)

You can use [`adapter-node`](adapter-node) to run a SvelteKit app within a container.

## Mobile app

You can turn a [SvelteKit SPA](https://kit.svelte.dev/docs/single-page-apps) into a mobile app with [Tauri](https://v2.tauri.app/start/frontend/sveltekit/) or [Capacitor](https://capacitorjs.com/solution/svelte). Mobile features like the camera, geolocation, and push notifications are available via plugins for both platforms.

These mobile development platforms work by starting a local web server and then serving your application like a static host on your phone. You may find [`bundleStrategy: 'single'`](configuration#output) to be a helpful option to limit the number of requests made. E.g. at the time of writing, the Capacitor local server uses HTTP/1, which limits the number of concurrent connections.

## Desktop app

You can turn a [SvelteKit SPA](https://kit.svelte.dev/docs/single-page-apps) into a desktop app [with Tauri](https://v2.tauri.app/start/frontend/sveltekit/).

## Browser extension

You can build browser extensions using either [`adapter-static`](adapter-static) or [community adapters](https://sveltesociety.dev/packages?category=sveltekit-adapters) specifically tailored towards browser extensions.

## Embedded device

Because of its efficient rendering, Svelte can be run on low power devices. Embedded devices like microcontrollers and TVs may limit the number of concurrent connections. In order to reduce the number of concurrent requests, you may find [`bundleStrategy: 'single'`](configuration#output) to be a helpful option in this deployment configuration.
