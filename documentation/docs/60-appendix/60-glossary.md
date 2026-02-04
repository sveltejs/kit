---
title: Glossary
---

The core of SvelteKit provides a highly configurable rendering engine. This section describes some of the terms used when discussing rendering. A reference for setting these options is provided in the documentation above.

## CSR

Client-side rendering (CSR) is the generation of the page contents in the web browser using JavaScript.

In SvelteKit, client-side rendering will be used by default, but you can turn off JavaScript with [the `csr = false` page option](page-options#csr).

## Edge

Rendering on the edge refers to rendering an application in a content delivery network (CDN) near the user. Edge rendering allows the request and response for a page to travel a shorter distance thus improving latency.

## Hybrid app

SvelteKit uses a hybrid rendering mode by default where it loads the initial HTML from the server (SSR), and then updates the page contents on subsequent navigations via client-side rendering (CSR).

## Hydration

Svelte components store some state and update the DOM when the state is updated. When fetching data during SSR, by default SvelteKit will store this data and transmit it to the client along with the server-rendered HTML. The components can then be initialized on the client with that data without having to call the same API endpoints again. Svelte will then check that the DOM is in the expected state and attach event listeners in a process called hydration. Once the components are fully hydrated, they can react to changes to their properties just like any newly created Svelte component.

In SvelteKit, pages will be hydrated by default, but you can turn off JavaScript with [the `csr = false` page option](page-options#csr).

## ISR

Incremental static regeneration (ISR) allows you to generate static pages on your site as visitors request those pages without redeploying. This may reduces build times compared to [SSG](#SSG) sites with a large number of pages. You can do [ISR with `adapter-vercel`](adapter-vercel#Incremental-Static-Regeneration).

## MPA

Traditional applications that render each page view on the server — such as those written in languages other than JavaScript — are often referred to as multi-page apps (MPA).

## Prerendering

Prerendering means computing the contents of a page at build time and saving the HTML for display. This approach has the same benefits as traditional server-rendered pages, but avoids recomputing the page for each visitor and so scales nearly for free as the number of visitors increases. The tradeoff is that the build process is more expensive and prerendered content can only be updated by building and deploying a new version of the application.

Not all pages can be prerendered. The basic rule is this: for content to be prerenderable, any two users hitting it directly must get the same content from the server, and the page must not contain [actions](form-actions). Note that you can still prerender content that is loaded based on the page's parameters as long as all users will be seeing the same prerendered content.

Pre-rendered pages are not limited to static content. You can build personalized pages if user-specific data is fetched and rendered client-side. This is subject to the caveat that you will experience the downsides of not doing SSR for that content as discussed above.

In SvelteKit, you can control prerendering with [the `prerender` page option](page-options#prerender) and [`prerender` config](configuration#prerender) in `svelte.config.js`.

## PWA

A progressive web app (PWA) is an app that's built using web APIs and technologies, but functions like a mobile or desktop app. Sites served as [PWAs can be installed](https://web.dev/learn/pwa/installation), allowing you to add a shortcut to the application on your launcher, home screen, or start menu. Many PWAs will utilize [service workers](service-workers) to build offline capabilities.

## Routing

By default, when you navigate to a new page (by clicking on a link or using the browser's forward or back buttons), SvelteKit will intercept the attempted navigation and handle it instead of allowing the browser to send a request to the server for the destination page. SvelteKit will then update the displayed contents on the client by rendering the component for the new page, which in turn can make calls to the necessary API endpoints. This process of updating the page on the client in response to attempted navigation is called client-side routing.

In SvelteKit, client-side routing will be used by default, but you can skip it with [`data-sveltekit-reload`](link-options#data-sveltekit-reload).

## SPA

A single-page app (SPA) is an application in which all requests to the server load a single HTML file which then does client-side rendering based on the requested URL. All navigation is handled on the client-side in a process called client-side routing with per-page contents being updated and common layout elements remaining largely unchanged. Throughout this site, when we refer to a SPA, we use this definition where a SPA simply serves an empty shell on the initial request. It should not be confused with a [hybrid app](#Hybrid-app), which serves HTML on the initial request. It has a large performance impact by forcing two network round trips before rendering can begin. Because SPA mode has large negative performance and SEO impacts, it is recommended only in very limited circumstances such as when being wrapped in a mobile app.

In SvelteKit, you can [build SPAs with `adapter-static`](single-page-apps).

## SSG

Static Site Generation (SSG) is a term that refers to a site where every page is prerendered. One benefit of fully prerendering a site is that you do not need to maintain or pay for servers to perform SSR. Once generated, the site can be served from CDNs, leading to great “time to first byte” performance. This delivery model is often referred to as JAMstack.

In SvelteKit, you can do static site generation by using [`adapter-static`](adapter-static) or by configuring every page to be prerendered using [the `prerender` page option](page-options#prerender) or [`prerender` config](configuration#prerender) in `svelte.config.js`.

## SSR

Server-side rendering (SSR) is the generation of the page contents on the server. Returning the page contents from the server via SSR or prerendering is highly preferred for performance and SEO. It significantly improves performance by avoiding the introduction of extra round trips necessary in a SPA, and makes your app accessible to users if JavaScript fails or is disabled (which happens [more often than you probably think](https://kryogenix.org/code/browser/everyonehasjs.html)). While some search engines can index content that is dynamically generated on the client-side, it is likely to take longer even in these cases.

In SvelteKit, pages are server-side rendered by default. You can disable SSR with [the `ssr` page option](page-options#ssr).
