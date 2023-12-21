---
title: Performance
---

SvelteKit strives to provide a highly performant experience by default. However, when building any web application you will always need to put in some effort to maintain fast speeds. Some tips are included below.

## Measuring

For deployed sites, you can measure your page's performance with [Google's PageSpeed Insights](https://pagespeed.web.dev/). More advanced users may also like to use [WebPageTest](https://www.webpagetest.org/).

You can also use your browser's developer tools to evaluate your page's performance and identify areas of opportunity. Check out some of the resources below if you're not already familiar with your browser's developer tools:

* Chrome - [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview#devtools), [Network](https://developer.chrome.com/docs/devtools/network), and [Performance](https://developer.chrome.com/docs/devtools/performance) tabs in the developer tools
* Firefox - [Network](https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/) and [Performance](https://hacks.mozilla.org/2022/03/performance-tool-in-firefox-devtools-reloaded/) tabs in the developer tools
* Edge - [Lighthouse](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/lighthouse/lighthouse-tool), [Network](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/network/), and [Performance](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/evaluate-performance/) tabs in the developer tools
* Safari - [enhancing the performance of your webpage](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/Web_Inspector_Tutorial/EnhancingyourWebpagesPerformance/EnhancingyourWebpagesPerformance.html)

### Instrumenting

If you see in the network tab of your browser that an API call is taking a long time and you'd like to understand why, you may consider instrumenting your backend with a tool like [OpenTelemetry](https://opentelemetry.io/) or [Server-Timing headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing).

## Multimedia

### Images

Typically the most impactful area of opportunity is optimizing your images. Svelte provides an offically-supported image optimization package. Please see the [images](images) page for more details. Additionally, you may use Lighthouse for identifying images needing optimization.

### Fonts

Preload fonts when possible with the appropriate by calling `resolve` with the appropriate `preload` option value in the [`handle`](hooks#server-hooks-handle) hook. Also ensure you've set the [`font-display`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display) option appropriately in your CSS. Additionally, you may reduce the size of font files with [subsetting](https://fonts.google.com/knowledge/glossary/subsetting).

### Videos

Video are very large files and so extra care should be taken to ensure that they're optimized:

- Compress videos with tools such as [Handbrake](https://handbrake.fr/). Consider converting the videos to HTML5 video formats such as WebM or MP4.
- [Lazy load](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) videos located below the fold.
- Strip the audio track out of muted videos using a tool like [FFmpeg](https://ffmpeg.org/).

## Code size

### Svelte version

We recommend running the latest version of Svelte. Svelte 4 is significantly smaller and faster than Svelte 3. The Svelte 5 preview is very significantly smaller and faster than Svelte 4 — though we don't recommend users upgrade to this version yet as it's not currently production ready.

### Packages

[`rollup-plugin-visualizer`](https://www.npmjs.com/package/rollup-plugin-visualizer) can be helpful for identifying which packages are adding the most size to your site. You may also find areas of opportunity manually inspecting the build output with [`build: { minify: false }`](https://vitejs.dev/config/build-options.html#build-minify) or via the network tab of your browser's developer tools.

### External scripts

Try to minimize the number of third-party scripts running in the browser. E.g. instead of using JavaScript-based analytics tracking, you may wish to use server-side implementations. Many hosting providers with SvelteKit adapters offer such functionality such as [Netlify](https://docs.netlify.com/monitor-sites/site-analytics/), [Cloudflare](https://www.cloudflare.com/web-analytics/), and [Vercel](https://vercel.com/docs/analytics).

You also may consider running third-party scripts in a webworker with [Partytown's SvelteKit integration](https://partytown.builder.io/sveltekit).

### Selective loading

Code imported via static import will be automatically bundled into your page's code. If there is a piece of code you need only when some condition is met, use a [dynamic import](https://vitejs.dev/guide/features#dynamic-import).

## Hosting

Your frontend should be located in the same data center as your backend for minimal latency. For sites with no backend, many SvelteKit adapters support deploying to "the edge", which means your code will be distributed globally so it can run next to your users. Some adapters even support [configuring deployment on a per-page basis](https://kit.svelte.dev/docs/page-options#config). You should also consider serving images from a CDN — the hosts for many adapters offered by SvelteKit will do this automatically.

Ensure your host uses HTTP/2 or newer. Vite's code splitting creates numerous small files for improved cacheability, which results in excellent performance, but this does assume that your files can be loaded in parallel with HTTP/2.

## Further reading

For the most part, building a performant SvelteKit app is the same as building any performant web app. You should be able to apply information from the following general performance resources to any web experience you build:

- [Core Web Vitals](https://web.dev/explore/learn-core-web-vitals)
