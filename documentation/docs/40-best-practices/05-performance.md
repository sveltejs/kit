---
title: Performance
---

Out of the box, SvelteKit does a lot of work to make your applications as performant as possible:

- Code-splitting, so that only the code you need for the current page is loaded
- Asset preloading, so that 'waterfalls' (of files requesting other files) are prevented
- File hashing, so that your assets can be cached forever
- Request coalescing, so that data fetched from separate server `load` functions is grouped into a single HTTP request
- Parallel loading, so that separate universal `load` functions fetch data simultaneously
- Data inlining, so that requests made with `fetch` during server rendering can be replayed in the browser without issuing a new request
- Prerendering (configurable on a per-route basis, if necessary) so that pages without dynamic data can be served instantaneously
- Link preloading, so that data and code requirements for a client-side navigation are eagerly anticipated

Nevertheless, we can't (yet) eliminate all sources of slowness. To eke out maximum performance, you should be mindful of the following tips.

## Measuring

You can measure the performance of a deployed app with Google's [PageSpeed Insights](https://pagespeed.web.dev/) or, for more advanced analysis, [WebPageTest](https://www.webpagetest.org/).

You can also use your browser's developer tools to evaluate your page's performance and identify areas of opportunity. Check out some of the resources below if you're not already familiar with your browser's developer tools:

* Chrome - [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview#devtools), [Network](https://developer.chrome.com/docs/devtools/network), and [Performance](https://developer.chrome.com/docs/devtools/performance) devtools
* Edge - [Lighthouse](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/lighthouse/lighthouse-tool), [Network](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/network/), and [Performance](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/evaluate-performance/) devtools
* Firefox - [Network](https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/) and [Performance](https://hacks.mozilla.org/2022/03/performance-tool-in-firefox-devtools-reloaded/) devtools
* Safari - [enhancing the performance of your webpage](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/Web_Inspector_Tutorial/EnhancingyourWebpagesPerformance/EnhancingyourWebpagesPerformance.html)

### Instrumenting

If you see in the network tab of your browser that an API call is taking a long time and you'd like to understand why, you may consider instrumenting your backend with a tool like [OpenTelemetry](https://opentelemetry.io/) or [Server-Timing headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing).

## Optimizing

### Multimedia

#### Images

Images are often one of the most impactful areas of opportunity for optimization. Svelte provides an offically-supported image optimization package. Please see the [images](images) page for more details. Additionally, Lighthouse is great for identifying which images on your site are the most problematic / in need of optimizations.

#### Fonts

When possible, preload fonts by calling `resolve` with the appropriate `preload` option in your [`handle`](hooks#server-hooks-handle) hook, and ensure you've set the [`font-display`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display) option in your CSS. To reduce the size of font files, utilize [subsetting](https://fonts.google.com/knowledge/glossary/subsetting).

#### Videos

Video files can be very large, so extra care should be taken to ensure that they're optimized:

- Compress videos with tools such as [Handbrake](https://handbrake.fr/). Consider converting the videos to HTML5 video formats such as WebM or MP4.
- [Lazy load](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) videos located below the fold.
- Strip the audio track out of muted videos using a tool like [FFmpeg](https://ffmpeg.org/).

### Code size

#### Svelte version

We recommend running the latest version of Svelte. Svelte 4 is significantly smaller and faster than Svelte 3. The Svelte 5 preview is _much_ smaller and faster than Svelte 4 — though we don't recommend users upgrade to this version until it's production ready.

#### Packages

[`rollup-plugin-visualizer`](https://www.npmjs.com/package/rollup-plugin-visualizer) can be helpful for identifying which packages are contributing the most to the size of your site. You may also find areas of opportunity manually inspecting the build output with [`build: { minify: false }`](https://vitejs.dev/config/build-options.html#build-minify), or via the network tab of your browser's developer tools.

#### External scripts

Try to minimize the number of third-party scripts running in the browser. E.g. instead of using JavaScript-based analytics tracking, you may wish to use server-side implementations. Many hosting providers with SvelteKit adapters offer such functionality such as [Netlify](https://docs.netlify.com/monitor-sites/site-analytics/), [Cloudflare](https://www.cloudflare.com/web-analytics/), and [Vercel](https://vercel.com/docs/analytics).

You also may consider running third-party scripts in a webworker with [Partytown's SvelteKit integration](https://partytown.builder.io/sveltekit).

#### Selective loading

Code imported via static imports will be automatically bundled into your page's code. If there is a piece of code you need only when some condition is met, use a [dynamic import](https://vitejs.dev/guide/features#dynamic-import).

### Prefetching

You can fetch [data](link-options#data-sveltekit-preload-data) and [code](link-options#data-sveltekit-preload-code) before a page is actually loaded when the user hovers over (or begins to click) a link with the appropriate [link options](link-options).

### Lazy loading

You can use a placeholder on the intial page load, then swap it out with real contents after the page is loaded. For images, you can do this with [the `loading` attribute](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading). To lazy load data, you can use [streaming with promises](load#streaming-with-promises).

### Hosting

Your frontend should be located in the same data center as your backend to minimize latency. For sites with no central backend, many SvelteKit adapters support deploying to the _edge_, which means handling each user's requests from a nearby server. This can reduce load times significantly. Some adapters even support [configuring deployment on a per-page basis](https://kit.svelte.dev/docs/page-options#config). You should also consider serving images from a CDN (which are typically edge networks) — the hosts for many adapters offered by SvelteKit will do this automatically.

Ensure your host uses HTTP/2 or newer. Vite's code splitting creates numerous small files for improved cacheability, which results in excellent performance, but this does assume that your files can be loaded in parallel with HTTP/2.

## Common issues

### Waterfalls

One of the biggest performance killers is what is referred to as a waterfall, which is a series of requests that is made sequentially. This can occur on the frontend or backend of your application.

#### Frontend asset waterfall

You can, for example, encounter a request waterfall when your HTML requests JS which requests CSS which requests a background image and web font. SvelteKit will largely solve this class of problems for you by adding [`modulepreload`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/modulepreload) tags or headers. However, you should view [the network tab in your developer tools](#measuring) to check whether there might be additional resources needing to be preloaded. Pay special attention to this if you use web [fonts](#fonts) since they need to be handled manually.

#### Frontend data waterfall

Another example of a waterfall would be when your frontend makes an API call to fetch the current user, then uses the details from that response to fetch a list of saved items, and then uses that response to fetch the details for each item. You can identify this by viewing [the network tab in your developer tools](#measuring) or with instrumentation like [OpenTelemetry](https://opentelemetry.io/). Avoid this issue by [making requests in parallel](load#parallel-loading) or joining requests into a single request as is done when using GraphQL.

#### Backend data waterfall

You can also, for example, encounter a waterfall when your backend makes a database query to get the current user, then makes a database query based on the result to get a list of saved items, then uses that result to get the details of each item. It will typically be more performant to issue a single query with a database join. You can identify this by logging queries made to your datastore or with instrumentation like [OpenTelemetry](https://opentelemetry.io/).

## Further reading

For the most part, building a performant SvelteKit app is the same as building any performant web app. You should be able to apply information from the following general performance resources to any web experience you build:

- [Core Web Vitals](https://web.dev/explore/learn-core-web-vitals)
