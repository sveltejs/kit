# @sveltejs/kit

## 1.0.0-next.274

### Patch Changes

- Set `$page.url` to current URL in browser ([#3942](https://github.com/sveltejs/kit/pull/3942))

## 1.0.0-next.273

### Patch Changes

- Correctly identify readable node streams ([#3941](https://github.com/sveltejs/kit/pull/3941))

* remove 'Shadow' from error message ([#3943](https://github.com/sveltejs/kit/pull/3943))

## 1.0.0-next.272

### Patch Changes

- Make shadow endpoint `event.url` consistent between server and client navigation ([#3780](https://github.com/sveltejs/kit/pull/3780))

* Prevent duplicated history when navigating via hash link ([#3931](https://github.com/sveltejs/kit/pull/3931))

## 1.0.0-next.271

### Patch Changes

- Add `transformPage` option to `resolve` ([#3914](https://github.com/sveltejs/kit/pull/3914))

## 1.0.0-next.270

### Patch Changes

- handle HEAD requests in endpoints ([#3903](https://github.com/sveltejs/kit/pull/3903))

* Use shadow endpoint without defining a `get` endpoint ([#3816](https://github.com/sveltejs/kit/pull/3816))

## 1.0.0-next.269

### Patch Changes

- Ensure handleError hook is called for shadow endpoint errors ([#3879](https://github.com/sveltejs/kit/pull/3879))

## 1.0.0-next.268

### Patch Changes

- refactor: use one escape function for json in html script body instead of two slightly different ([#3804](https://github.com/sveltejs/kit/pull/3804))

## 1.0.0-next.267

### Patch Changes

- Set cookies when redirecting from shadow endpoint ([#3874](https://github.com/sveltejs/kit/pull/3874))

## 1.0.0-next.266

### Patch Changes

- fix casing of `.DS_Store` in the default config for `serviceWorker` ([#3823](https://github.com/sveltejs/kit/pull/3823))

* [fix] avoid mutating response `Headers` ([#3829](https://github.com/sveltejs/kit/pull/3829))

## 1.0.0-next.265

### Patch Changes

- [breaking] remove `createIndexFiles` option, derive from `trailingSlash` instead ([#3801](https://github.com/sveltejs/kit/pull/3801))

* Pass trailingSlash config to adapters ([#3820](https://github.com/sveltejs/kit/pull/3820))

## 1.0.0-next.264

### Patch Changes

- fix links pointing to multi-page docs ([#3815](https://github.com/sveltejs/kit/pull/3815))

* upgrade to TypeScript 4.5 ([#3809](https://github.com/sveltejs/kit/pull/3809))

## 1.0.0-next.263

### Patch Changes

- Handle numeric headers ([#3716](https://github.com/sveltejs/kit/pull/3716))

* [fix] replace broken escaping with a working version ([#3798](https://github.com/sveltejs/kit/pull/3798))

## 1.0.0-next.262

### Patch Changes

- update to Vite 2.8 and esbuild 0.14 ([#3791](https://github.com/sveltejs/kit/pull/3791))

## 1.0.0-next.261

### Patch Changes

- Prevent full reload when router navigates and only removes hash ([#3757](https://github.com/sveltejs/kit/pull/3757))

* fixes shadow hydration escaping ([#3793](https://github.com/sveltejs/kit/pull/3793))

- fixes an error with fetching shadow endpoints if they are ending with '/' ([#3740](https://github.com/sveltejs/kit/pull/3740))

## 1.0.0-next.260

### Patch Changes

- Allow Response object to be returned without properties showing up in object constructor ([#3697](https://github.com/sveltejs/kit/pull/3697))

* Implement shadow endpoints ([#3679](https://github.com/sveltejs/kit/pull/3679))

## 1.0.0-next.259

### Patch Changes

- Prevent `Host` header from being incorrectly inherited by requests made from `load`'s `fetch` during SSR ([#3690](https://github.com/sveltejs/kit/pull/3690))

## 1.0.0-next.258

### Patch Changes

- Update \$app/stores page.stuff to use App.Stuff ([#3686](https://github.com/sveltejs/kit/pull/3686))

## 1.0.0-next.257

### Patch Changes

- Rename JSONString type to JSONValue ([#3683](https://github.com/sveltejs/kit/pull/3683))

* Add App namespace for app-level types ([#3670](https://github.com/sveltejs/kit/pull/3670))

- [breaking] remove target option ([#3674](https://github.com/sveltejs/kit/pull/3674))

## 1.0.0-next.256

### Patch Changes

- fix regression in parsing HTML when crawling for pre-rendering ([#3677](https://github.com/sveltejs/kit/pull/3677))

## 1.0.0-next.255

### Patch Changes

- fix parsing during pre-render crawl when there are HTML attributes without a value ([#3668](https://github.com/sveltejs/kit/pull/3668))

* Correctly populate asset manifest when generating service worker ([#3673](https://github.com/sveltejs/kit/pull/3673))

## 1.0.0-next.254

### Patch Changes

- Add version config and expose updated store ([#3412](https://github.com/sveltejs/kit/pull/3412))

* [fix] update types to match changes to Vite config handling ([#3662](https://github.com/sveltejs/kit/pull/3662))

## 1.0.0-next.253

### Patch Changes

- Allow config.kit.vite to be an async function ([#3565](https://github.com/sveltejs/kit/pull/3565))

* Include page request headers in server-side fetches ([#3631](https://github.com/sveltejs/kit/pull/3631))

## 1.0.0-next.252

### Patch Changes

- remove nonexistent `url` store from `$app/stores` ambient types ([#3640](https://github.com/sveltejs/kit/pull/3640))

## 1.0.0-next.251

### Patch Changes

- Handle non-compliant ReadableStream implementations ([#3624](https://github.com/sveltejs/kit/pull/3624))

## 1.0.0-next.250

### Patch Changes

- [breaking] move `config.kit.hydrate` and `config.kit.router` to `config.kit.browser` ([#3578](https://github.com/sveltejs/kit/pull/3578))

* add `prerender.createIndexFiles` option ([#2632](https://github.com/sveltejs/kit/pull/2632))

## 1.0.0-next.249

### Patch Changes

- Include service worker in manifest ([#3570](https://github.com/sveltejs/kit/pull/3570))

* Add kit.routes config to customise public/private modules ([#3576](https://github.com/sveltejs/kit/pull/3576))

## 1.0.0-next.248

### Patch Changes

- Decode fetched resources before checking against manifest when prerendering ([#3571](https://github.com/sveltejs/kit/pull/3571))

* [breaking] remove -H and (conflicting) -h shortcuts from CLI ([#3573](https://github.com/sveltejs/kit/pull/3573))

## 1.0.0-next.247

### Patch Changes

- fix handling an incoming request from HTTP/2 ([#3572](https://github.com/sveltejs/kit/pull/3572))

## 1.0.0-next.246

### Patch Changes

- `svelte-kit package` gives clearer error message when svelte2tsx and typescript are not installed ([#3562](https://github.com/sveltejs/kit/pull/3562))

* `svelte-kit package` errors when lib directory does not exist ([#3562](https://github.com/sveltejs/kit/pull/3562))

- [chore] refactor AMP validation ([#3554](https://github.com/sveltejs/kit/pull/3554))

## 1.0.0-next.245

### Patch Changes

- Allow adapters to pass in `platform` object ([#3429](https://github.com/sveltejs/kit/pull/3429))

* favicon.ico is now requestable ([#3559](https://github.com/sveltejs/kit/pull/3559))

## 1.0.0-next.244

### Patch Changes

- [fix] reading from same response body twice during prerender (#3473) ([#3521](https://github.com/sveltejs/kit/pull/3521))

* Add CSP support ([#3499](https://github.com/sveltejs/kit/pull/3499))

- [chore] remove InternalHandle ([#3541](https://github.com/sveltejs/kit/pull/3541))

* Force Vite to use HTTP/1 in dev mode, so `dev --https` works again ([#3553](https://github.com/sveltejs/kit/pull/3553))

## 1.0.0-next.243

### Patch Changes

- [fix] hydrate real HTTP requests ([#3547](https://github.com/sveltejs/kit/pull/3547))

## 1.0.0-next.242

### Patch Changes

- reinstate `EndpointOutput` generic ([#3537](https://github.com/sveltejs/kit/pull/3537))

## 1.0.0-next.241

### Patch Changes

- `svelte-kit package` only encodes text files ([#3522](https://github.com/sveltejs/kit/pull/3522))

## 1.0.0-next.240

### Patch Changes

- Error if handle hook returns something other than a Response ([#3496](https://github.com/sveltejs/kit/pull/3496))

* allow setting multiple set-cookie headers ([#3502](https://github.com/sveltejs/kit/pull/3502))

- fixed prerendering with base path configured ([#3500](https://github.com/sveltejs/kit/pull/3500))

## 1.0.0-next.239

### Patch Changes

- Insert <meta http-equiv> cache-control header when prerendering ([#3493](https://github.com/sveltejs/kit/pull/3493))

## 1.0.0-next.238

### Patch Changes

- Escape prerendered redirect locations, instead of encoding them ([#3456](https://github.com/sveltejs/kit/pull/3456))

## 1.0.0-next.237

### Patch Changes

- Type compilerOptions as CompileOptions instead of any ([#3486](https://github.com/sveltejs/kit/pull/3486))

## 1.0.0-next.236

### Patch Changes

- The redirect property returned from a module's load function must now be a properly encoded URI string value. ([#3404](https://github.com/sveltejs/kit/pull/3404))

## 1.0.0-next.235

### Patch Changes

- register service worker regardless of hydrate/router option ([#3435](https://github.com/sveltejs/kit/pull/3435))

## 1.0.0-next.234

### Patch Changes

- Allow endpoints to return a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response), or an object with [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) ([docs](https://kit.svelte.dev/docs/routing#endpoints), [#3384](https://github.com/sveltejs/kit/pull/3384))

* [breaking] Expose standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object to endpoints and hooks. `method`, `headers`, and `body` now accessed through `request` field ([docs](https://kit.svelte.dev/docs/routing#endpoints), [#3384](https://github.com/sveltejs/kit/pull/3384))

- [breaking] change `app.render` signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))

* [breaking] move protocol/host configuration options from Kit to adapter-node ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.233

### Patch Changes

- [fix] refactor navigation singletons to avoid storing undefined reference ([#3374](https://github.com/sveltejs/kit/pull/3374))

* [fix] add media="(max-width: 0)" to prevent stylesheets from downloading ([#3396](https://github.com/sveltejs/kit/pull/3396))

## 1.0.0-next.232

### Patch Changes

- Preserve explicit ETag header ([#3348](https://github.com/sveltejs/kit/pull/3348))

* [fix] ignore hash links during prerendering (again) ([#3367](https://github.com/sveltejs/kit/pull/3367))

## 1.0.0-next.231

### Patch Changes

- Handle requests for /basepath ([#3345](https://github.com/sveltejs/kit/pull/3345))

* Allow \_\_fetch_polyfill() to run several times ([#3357](https://github.com/sveltejs/kit/pull/3357))

- Handle static assets with /basepath in svelte-kit dev ([#3346](https://github.com/sveltejs/kit/pull/3346))

## 1.0.0-next.230

### Patch Changes

- Log errors to stderr rather than stdout ([#3328](https://github.com/sveltejs/kit/pull/3328))

## 1.0.0-next.229

### Patch Changes

- The path to a service worker is now rebased to the app's base path ([#3319](https://github.com/sveltejs/kit/pull/3319))

## 1.0.0-next.228

### Patch Changes

- Throw on accessing url.search/searchParams from page store during prerendering ([#3314](https://github.com/sveltejs/kit/pull/3314))

* Preserve relevant headers when serving 304s ([#3313](https://github.com/sveltejs/kit/pull/3313))

## 1.0.0-next.227

### Patch Changes

- Adds beforeNavigate/afterNavigate lifecycle functions ([#3293](https://github.com/sveltejs/kit/pull/3293))

## 1.0.0-next.226

### Patch Changes

- Fix srcset parsing ([#3301](https://github.com/sveltejs/kit/pull/3301))

* Change ReadOnlyFormData behavior to mimic the spec's FormData interface ([#3302](https://github.com/sveltejs/kit/pull/3302))

## 1.0.0-next.225

### Patch Changes

- add inlineStyleThreshold option, below which stylesheets are inlined into the page ([#2620](https://github.com/sveltejs/kit/pull/2620))

## 1.0.0-next.224

### Patch Changes

- More robust crawling of prerendered pages ([#3288](https://github.com/sveltejs/kit/pull/3288))

## 1.0.0-next.223

### Patch Changes

- Add methodOverride option for submitting PUT/PATCH/DELETE/etc with <form> elements ([#2989](https://github.com/sveltejs/kit/pull/2989))

## 1.0.0-next.222

### Patch Changes

- Remove `config.kit.ssr` and `export const ssr` in favour of `ssr` parameter for `resolve` function in `handle` ([#2804](https://github.com/sveltejs/kit/pull/2804))

## 1.0.0-next.221

### Patch Changes

- Add returned stuff from pages into \$page store ([#3252](https://github.com/sveltejs/kit/pull/3252))

* Fallthrough is now explicit and layout components now also support fallthrough ([#3217](https://github.com/sveltejs/kit/pull/3217))

## 1.0.0-next.220

### Patch Changes

- url hash is now properly reflected in page store ([#3273](https://github.com/sveltejs/kit/pull/3273))

* Strip hash fragments from URLs during prerendering ([#3251](https://github.com/sveltejs/kit/pull/3251))

- Allow prefixes and suffixes around rest parameters ([#3240](https://github.com/sveltejs/kit/pull/3240))

## 1.0.0-next.219

### Patch Changes

- Render error page if error happens in handle hook ([#3239](https://github.com/sveltejs/kit/pull/3239))

* [chore] update dependency sirv to v2 ([#3263](https://github.com/sveltejs/kit/pull/3263))

## 1.0.0-next.218

### Patch Changes

- Expose appDir to adapters ([#3222](https://github.com/sveltejs/kit/pull/3222))

* Replace %svelte.assets% with relative path ([#3234](https://github.com/sveltejs/kit/pull/3234))

## 1.0.0-next.217

### Patch Changes

- Improve error message when svelte.config.js is not found ([#3219](https://github.com/sveltejs/kit/pull/3219))

* Support more text content types ([#2781](https://github.com/sveltejs/kit/pull/2781))

## 1.0.0-next.216

### Patch Changes

- make html template optional for `svelte-kit package` ([#3161](https://github.com/sveltejs/kit/pull/3161))

* Allow multiple different headers returned from one endpoint ([#3201](https://github.com/sveltejs/kit/pull/3201))

## 1.0.0-next.215

### Patch Changes

- Fix hash change focus behaviour ([#3177](https://github.com/sveltejs/kit/pull/3177))

## 1.0.0-next.214

### Patch Changes

- [breaking] Add `disableScrollHandling` function (see https://kit.svelte.dev/docs/modules#$app-navigation) ([#3182](https://github.com/sveltejs/kit/pull/3182))

## 1.0.0-next.213

### Patch Changes

- Don't register service worker if there is none ([#3170](https://github.com/sveltejs/kit/pull/3170))

* Fix url pathname for prerenders ([#3178](https://github.com/sveltejs/kit/pull/3178))

## 1.0.0-next.212

### Patch Changes

- Add status and error to page store ([#3096](https://github.com/sveltejs/kit/pull/3096))

* Fix dev prebundling scanner ([#3169](https://github.com/sveltejs/kit/pull/3169))

- Sort rest endpoints before pages ([#3168](https://github.com/sveltejs/kit/pull/3168))

## 1.0.0-next.211

### Patch Changes

- Use Vite's filewatcher in dev mode instead of creating a new one

## 1.0.0-next.210

### Patch Changes

- Add path/query error getters in prod mode ([#3151](https://github.com/sveltejs/kit/pull/3151))

## 1.0.0-next.209

### Patch Changes

- Bundle SSR renderer with app ([#3144](https://github.com/sveltejs/kit/pull/3144))

## 1.0.0-next.208

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Replace config.kit.hostHeader with config.kit.headers.host, add config.kit.headers.protocol ([#2931](https://github.com/sveltejs/kit/pull/2931))

- Replace page.host with page.origin ([#2931](https://github.com/sveltejs/kit/pull/2931))

* [fix] load CSS before JS preloads

- Error if adapter provides wrong input to app.render ([#3133](https://github.com/sveltejs/kit/pull/3133))

* Replace [request|page].[origin|path|query] with url object ([#3133](https://github.com/sveltejs/kit/pull/3133))

## 1.0.0-next.207

### Patch Changes

- Add serviceWorker.register option ([#2988](https://github.com/sveltejs/kit/pull/2988))

## 1.0.0-next.206

### Patch Changes

- Handle `Headers` instance in server-side `fetch` ([#3034](https://github.com/sveltejs/kit/pull/3034))

## 1.0.0-next.205

### Patch Changes

- Add `config.kit.prerender.concurrency` setting ([#3120](https://github.com/sveltejs/kit/pull/3120))

## 1.0.0-next.204

### Patch Changes

- fix `<Route> received an unexpected slot "default"` warning ([#3115](https://github.com/sveltejs/kit/pull/3115))

## 1.0.0-next.203

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.32 ([#3048](https://github.com/sveltejs/kit/pull/3048))

* fix `sveltekit:prefetch` mouse detection ([#2995](https://github.com/sveltejs/kit/pull/2995))

- Sort rest routes alphabetically ([#3093](https://github.com/sveltejs/kit/pull/3093))

* Fix invalid amp-install-serviceworker ([#3075](https://github.com/sveltejs/kit/pull/3075))

## 1.0.0-next.202

### Patch Changes

- [fix] upgrade to Vite 2.7 ([#3018](https://github.com/sveltejs/kit/pull/3018))

* Allow absolute file paths given to package.dir ([#3012](https://github.com/sveltejs/kit/pull/3012))

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.201

### Patch Changes

- Ignore mailto: and tel: links ([#2915](https://github.com/sveltejs/kit/pull/2915))

## 1.0.0-next.200

### Patch Changes

- Follow redirects when prerendering ([#2832](https://github.com/sveltejs/kit/pull/2832))

* Fix types reference in exports in package.json ([#2896](https://github.com/sveltejs/kit/pull/2896))

## 1.0.0-next.199

### Patch Changes

- [fix] support etag W/ prefix ([#2709](https://github.com/sveltejs/kit/pull/2709))

* [fix] revert #2819 and add code comment ([#2883](https://github.com/sveltejs/kit/pull/2883))

- Don't create empty dirs when packaging ([#2831](https://github.com/sveltejs/kit/pull/2831))

* [feat] Use `event.composedPath` to find anchors for prefetching and routing ([#2769](https://github.com/sveltejs/kit/pull/2769))

## 1.0.0-next.198

### Patch Changes

- Register custom service worker for AMP ([#2265](https://github.com/sveltejs/kit/pull/2265))

## 1.0.0-next.197

### Patch Changes

- [fix] prevent text unselection for keepfocus ([#2857](https://github.com/sveltejs/kit/pull/2857))

* [fix] use defaults when no opts passed to router ([#2819](https://github.com/sveltejs/kit/pull/2819))

## 1.0.0-next.196

### Patch Changes

- remove all selection before navigating to the next page ([#2755](https://github.com/sveltejs/kit/pull/2755))

* [fix] properly scroll if body has margin ([#2761](https://github.com/sveltejs/kit/pull/2761))

## 1.0.0-next.195

### Patch Changes

- [fix] increase scroll debounce timeout ([#2749](https://github.com/sveltejs/kit/pull/2749))

* [fix] do not set inlineDynamicImports ([#2753](https://github.com/sveltejs/kit/pull/2753))

## 1.0.0-next.194

### Patch Changes

- [fix] correct message when serving with strict:false ([#2726](https://github.com/sveltejs/kit/pull/2726))

* [fix] reset scroll when navigated from scrolled page ([#2735](https://github.com/sveltejs/kit/pull/2735))

## 1.0.0-next.193

### Patch Changes

- [fix] upgrade minor deps. fetch-blob 3.1.3 needed for Netlify deploys ([#2714](https://github.com/sveltejs/kit/pull/2714))

* [fix] scroll to elements provided via URL hash ([#2668](https://github.com/sveltejs/kit/pull/2668))

## 1.0.0-next.192

### Patch Changes

- [fix] allow overriding inlineDynamicImports ([#2702](https://github.com/sveltejs/kit/pull/2702))

## 1.0.0-next.191

### Patch Changes

- Return the copied files from the adapter's copy\_ utils. ([#2674](https://github.com/sveltejs/kit/pull/2674))

* [fix] avoid infinite loop if no routes found ([#2614](https://github.com/sveltejs/kit/pull/2614))

- [security] upgrade to Vite 2.6.12, specify allow list, and print warning ([#2691](https://github.com/sveltejs/kit/pull/2691))

## 1.0.0-next.190

### Patch Changes

- [fix] upgrade to Vite 2.6.11 ([#2683](https://github.com/sveltejs/kit/pull/2683))

* Return an array of written files when prerendering. ([#2675](https://github.com/sveltejs/kit/pull/2675))

## 1.0.0-next.189

### Patch Changes

- [breaking] only route pages on the client-side ([#2656](https://github.com/sveltejs/kit/pull/2656))

## 1.0.0-next.188

### Patch Changes

- [fix] fire navigation-end event only at end of navigation ([#2649](https://github.com/sveltejs/kit/pull/2649))

* [fix] allow passing certificates via config ([#2622](https://github.com/sveltejs/kit/pull/2622))

## 1.0.0-next.187

### Patch Changes

- Fix prerendering when paths.base but not paths.assets is specified ([#2643](https://github.com/sveltejs/kit/pull/2643))

## 1.0.0-next.186

### Patch Changes

- [chore] upgrade to Vite 2.6.10 ([#2634](https://github.com/sveltejs/kit/pull/2634))

## 1.0.0-next.185

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.30 ([#2626](https://github.com/sveltejs/kit/pull/2626))

* [fix] allow users to override build target ([#2618](https://github.com/sveltejs/kit/pull/2618))

## 1.0.0-next.184

### Patch Changes

- [breaking] drop Node 12 support ([#2604](https://github.com/sveltejs/kit/pull/2604))

## 1.0.0-next.183

### Patch Changes

- fix XSS vulnerability in `page.path` and `page.params` during SSR ([#2597](https://github.com/sveltejs/kit/pull/2597))

## 1.0.0-next.182

### Patch Changes

- [fix] fixes for firing of hashchange event ([#2591](https://github.com/sveltejs/kit/pull/2591))

## 1.0.0-next.181

### Patch Changes

- [fix] improve type of `init` ([#2544](https://github.com/sveltejs/kit/pull/2544))

* update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

- [fix] implement support for hashchange event ([#2590](https://github.com/sveltejs/kit/pull/2590))

* [chore] upgrade to Vite 2.6.7 ([#2586](https://github.com/sveltejs/kit/pull/2586))

## 1.0.0-next.180

### Patch Changes

- [fix] don't expose prerender options ([#2543](https://github.com/sveltejs/kit/pull/2543))

* [chore] upgrade to Vite 2.6.3" ([#2557](https://github.com/sveltejs/kit/pull/2557))

- upgrade commonjs plugin for better ignoreTryCatch default ([#2539](https://github.com/sveltejs/kit/pull/2539))

## 1.0.0-next.179

### Patch Changes

- Fix escaping of URLs of endpoint responses serialized into SSR response ([#2534](https://github.com/sveltejs/kit/pull/2534))

## 1.0.0-next.178

### Patch Changes

- [fix] restore functioning of --host CLI flag with no arg ([#2525](https://github.com/sveltejs/kit/pull/2525))

## 1.0.0-next.177

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))

* fix browser-only redirect during load. ([#2462](https://github.com/sveltejs/kit/pull/2462))

## 1.0.0-next.176

### Patch Changes

- [feat] allow using Vite's `strict.port: false` option ([#2507](https://github.com/sveltejs/kit/pull/2507))

* [fix] allow passing in https certs again' ([#2512](https://github.com/sveltejs/kit/pull/2512))

## 1.0.0-next.175

### Patch Changes

- [chore] upgrade node-fetch to 3.0.0 final ([#2422](https://github.com/sveltejs/kit/pull/2422))

* [fix] don't override application focus and scroll ([#2489](https://github.com/sveltejs/kit/pull/2489))

## 1.0.0-next.174

### Patch Changes

- Fix script and style tags without attributes crashing svelte-kit package ([#2492](https://github.com/sveltejs/kit/pull/2492))

## 1.0.0-next.173

### Patch Changes

- Exports and files property in config.kit.package now accepts a function rather than an object ([#2430](https://github.com/sveltejs/kit/pull/2430))

* Renamed property exclude to files in config.kit.serviceWorker and now accepts a function instead ([#2430](https://github.com/sveltejs/kit/pull/2430))

- Remove lang tag when packaging ([#2486](https://github.com/sveltejs/kit/pull/2486))

## 1.0.0-next.172

### Patch Changes

- [chore] upgrade to Svelte 3.43.0" ([#2474](https://github.com/sveltejs/kit/pull/2474))

* [breaking] rename the `context` parameter of the load function to `stuff` ([#2439](https://github.com/sveltejs/kit/pull/2439))

## 1.0.0-next.171

### Patch Changes

- Fix preview when `kit.paths.base` is set. ([#2409](https://github.com/sveltejs/kit/pull/2409))

* Resolve \$lib alias when packaging ([#2453](https://github.com/sveltejs/kit/pull/2453))

## 1.0.0-next.170

### Patch Changes

- Fix prerendering/adapter-static failing when `kit.paths.base` was set. ([#2407](https://github.com/sveltejs/kit/pull/2407))

## 1.0.0-next.169

### Patch Changes

- Add "svelte" field to package.json when running package command ([#2431](https://github.com/sveltejs/kit/pull/2431))

* [fix] revert #2354 and fix double character decoding a different way ([#2435](https://github.com/sveltejs/kit/pull/2435))

- [feat] use the Vite server options in dev mode ([#2232](https://github.com/sveltejs/kit/pull/2232))

* update dependencies ([#2447](https://github.com/sveltejs/kit/pull/2447))

## 1.0.0-next.168

### Patch Changes

- [fix] encodeURI during prerender ([#2427](https://github.com/sveltejs/kit/pull/2427))

* [chore] add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.167

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.24 ([#2423](https://github.com/sveltejs/kit/pull/2423))

* Add a generic argument to allow typing Body from hooks ([#2413](https://github.com/sveltejs/kit/pull/2413))

## 1.0.0-next.166

### Patch Changes

- [chore] upgrade Vite to 2.5.7

* [fix] deeply-nested error components render with correct layout ([#2389](https://github.com/sveltejs/kit/pull/2389))

- Update vite-plugin-svelte to 1.0.0-next.23 ([#2402](https://github.com/sveltejs/kit/pull/2402))

* [fix] pass along set-cookie headers during SSR ([#2362](https://github.com/sveltejs/kit/pull/2362))

## 1.0.0-next.165

### Patch Changes

- [chore] upgrade Vite

* [breaking] rename prerender.pages config option to prerender.entries ([#2380](https://github.com/sveltejs/kit/pull/2380))

- [fix] anchor tag inside svg ([#2286](https://github.com/sveltejs/kit/pull/2286))

## 1.0.0-next.164

### Patch Changes

- [fix] error components render with correct layout client-side as well as server-side ([#2378](https://github.com/sveltejs/kit/pull/2378))

* refactor `import.meta.env` usage in `$app/stores.js` to use `$app/env.js` to DRY code and make mocking easier ([#2353](https://github.com/sveltejs/kit/pull/2353))

- Trim `.js` extensions in package exports field ([#2345](https://github.com/sveltejs/kit/pull/2345))

## 1.0.0-next.163

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.22 ([#2370](https://github.com/sveltejs/kit/pull/2370))

* [fix] load function should not leak props to other components ([#2356](https://github.com/sveltejs/kit/pull/2356))

- packaging merge exports field by default ([#2327](https://github.com/sveltejs/kit/pull/2327))

* [fix] don't decode URL when finding matching route ([#2354](https://github.com/sveltejs/kit/pull/2354))

## 1.0.0-next.162

### Patch Changes

- Enable nested dependency optimization by updating to @sveltejs/vite-plugin-svelte@1.0.0-next.21 ([#2343](https://github.com/sveltejs/kit/pull/2343))

## 1.0.0-next.161

### Patch Changes

- Allow service workers to access files using the \$lib alias ([#2326](https://github.com/sveltejs/kit/pull/2326))

* [fix] remove Vite workaround now that dev deps can be bundled ([#2340](https://github.com/sveltejs/kit/pull/2340))

- support using arrays for kit.vite.resolve.alias ([#2328](https://github.com/sveltejs/kit/pull/2328))

## 1.0.0-next.160

### Patch Changes

- [fix] upgrade to Vite 2.5.2 to fix URL decoding ([#2323](https://github.com/sveltejs/kit/pull/2323))

* Add `@sveltejs/kit` to `noExternal` in dev server as well ([#2332](https://github.com/sveltejs/kit/pull/2332))

## 1.0.0-next.159

### Patch Changes

- Add `@sveltejs/kit` to noExternal to resolve hooks module in dev server ([#2306](https://github.com/sveltejs/kit/pull/2306))

* [fix] HMR on Windows ([#2315](https://github.com/sveltejs/kit/pull/2315))

## 1.0.0-next.158

### Patch Changes

- avoid setting rawBody/body to an empty Uint8Array when a load's fetch function is called with no body during SSR ([#2295](https://github.com/sveltejs/kit/pull/2295))

## 1.0.0-next.157

### Patch Changes

- [chore] separate RequestHeaders and ResponseHeaders types ([#2248](https://github.com/sveltejs/kit/pull/2248))

* [fix] don't de-indent user-rendered HTML ([#2292](https://github.com/sveltejs/kit/pull/2292))

## 1.0.0-next.156

### Patch Changes

- allow any top-level keys in svelte config ([#2267](https://github.com/sveltejs/kit/pull/2267))

* Exclude emitted declarations on packaging ([#2247](https://github.com/sveltejs/kit/pull/2247))

## 1.0.0-next.155

### Patch Changes

- [chore] export App types ([#2259](https://github.com/sveltejs/kit/pull/2259))

## 1.0.0-next.154

### Patch Changes

- Upgrade to Vite 2.5.0 ([#2231](https://github.com/sveltejs/kit/pull/2231))

## 1.0.0-next.153

### Patch Changes

- rename serverFetch to externalFetch ([#2110](https://github.com/sveltejs/kit/pull/2110))

## 1.0.0-next.152

### Patch Changes

- Check ports usage in a more cross-platform way in dev server error logging ([#2209](https://github.com/sveltejs/kit/pull/2209))

* Ensure the raw body is an Uint8Array before passing it to request handlers ([#2215](https://github.com/sveltejs/kit/pull/2215))

## 1.0.0-next.151

### Patch Changes

- fix new route discovery in dev server ([#2198](https://github.com/sveltejs/kit/pull/2198))

## 1.0.0-next.150

### Patch Changes

- [fix] match route against decoded path on client ([#2206](https://github.com/sveltejs/kit/pull/2206))

## 1.0.0-next.149

### Patch Changes

- export `HandleError` type ([#2200](https://github.com/sveltejs/kit/pull/2200))

* [fix] match regex against route only once ([#2203](https://github.com/sveltejs/kit/pull/2203))

## 1.0.0-next.148

### Patch Changes

- update svelte peerDependency to 3.39.0 ([#2182](https://github.com/sveltejs/kit/pull/2182))

* Add hook to handle errors ([#2193](https://github.com/sveltejs/kit/pull/2193))

- Use /\_svelte_kit_assets when serving apps with specified paths.assets locally ([#2189](https://github.com/sveltejs/kit/pull/2189))

* Serve from basepath in svelte-kit dev/preview ([#2189](https://github.com/sveltejs/kit/pull/2189))

- Disallow non-absolute paths.assets option ([#2189](https://github.com/sveltejs/kit/pull/2189))

* Allow `EndpointOutput` response body objects to have a `toJSON` property ([#2170](https://github.com/sveltejs/kit/pull/2170))

## 1.0.0-next.147

### Patch Changes

- [fix] handle paths consistently between dev and various production adapters ([#2171](https://github.com/sveltejs/kit/pull/2171))

* Replace function properties by methods on type declarations ([#2158](https://github.com/sveltejs/kit/pull/2158))

- [fix] fallback should still be generated when prerender is disabled ([#2128](https://github.com/sveltejs/kit/pull/2128))

* update vite-plugin-svelte to 1.0.0-next.16 ([#2179](https://github.com/sveltejs/kit/pull/2179))

- Set optimizeDeps.entries to [] when building service worker ([#2180](https://github.com/sveltejs/kit/pull/2180))

## 1.0.0-next.146

### Patch Changes

- [fix] enable Vite pre-bundling except for Svelte packages ([#2137](https://github.com/sveltejs/kit/pull/2137))

## 1.0.0-next.145

### Patch Changes

- [feat] detect if app tries to access query with prerender enabled ([#2104](https://github.com/sveltejs/kit/pull/2104))

## 1.0.0-next.144

### Patch Changes

- 241dd623: [fix] point at true dev entry point

## 1.0.0-next.143

### Patch Changes

- 8c0ffb8f: [fix] provide explicit JS entry point for Vite dev mode ([#2134](https://github.com/sveltejs/kit/pull/2134))
- c3c25ee0: [fix] take into account page-level options on error pages ([#2117](https://github.com/sveltejs/kit/pull/2117))

## 1.0.0-next.142

### Patch Changes

- aed1bd07: [fix] fully initialize router before rendering ([#2089](https://github.com/sveltejs/kit/pull/2089))
- 970bb04c: restore reverted config changes ([#2093](https://github.com/sveltejs/kit/pull/2093))

## 1.0.0-next.141

### Patch Changes

- d109a394: [fix] successfully load nested error pages ([#2076](https://github.com/sveltejs/kit/pull/2076))
- fab67c94: [fix] successfully handle client errors ([#2077](https://github.com/sveltejs/kit/pull/2077))
- 943f5288: [fix] solve regression parsing unicode URLs ([#2078](https://github.com/sveltejs/kit/pull/2078))
- 4435a659: [fix] allow endpoint shadowing to work ([#2074](https://github.com/sveltejs/kit/pull/2074))
- ee73a265: [fix] correctly do fallthrough in simple case ([#2072](https://github.com/sveltejs/kit/pull/2072))

## 1.0.0-next.140

### Patch Changes

- e55bc44a: [fix] revert change to rendering options ([#2008](https://github.com/sveltejs/kit/pull/2008))
- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))
- 5911b1c7: [fix] consider protocol-relative URLs as external ([#2062](https://github.com/sveltejs/kit/pull/2062))

## 1.0.0-next.139

### Patch Changes

- 883d4b85: Add public API to let adapters update .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))
- 8cbe3b05: Change `force` to `onError` in prerender config options ([#2030](https://github.com/sveltejs/kit/pull/2030))
- 1b18a844: Don't check external links on prerender ([#1679](https://github.com/sveltejs/kit/pull/1679))
- 7645399a: [fix] correctly pass Vite options in preview mode ([#2036](https://github.com/sveltejs/kit/pull/2036))

## 1.0.0-next.138

### Patch Changes

- d6563169: [chore] prefer interfaces to types ([#2010](https://github.com/sveltejs/kit/pull/2010))
- b18a45c1: explicitly set compilerOptions.hydratable to config.kit.hydrate ([#2024](https://github.com/sveltejs/kit/pull/2024))
- 538de3eb: [feat] More powerful and configurable rendering options ([#2008](https://github.com/sveltejs/kit/pull/2008))
- 20dad18a: Remove the `prerender.force` option in favor of `prerender.onError` ([#2007](https://github.com/sveltejs/kit/pull/2007))

## 1.0.0-next.137

### Patch Changes

- bce1d76a: [chore] improved typing for runtime and tests ([#1995](https://github.com/sveltejs/kit/pull/1995))
- 2a1e9795: [chore] enable TypeScript strict mode ([#1998](https://github.com/sveltejs/kit/pull/1998))

## 1.0.0-next.136

### Patch Changes

- 69b92ec1: [chore] improved typing on core library ([#1993](https://github.com/sveltejs/kit/pull/1993))

## 1.0.0-next.135

### Patch Changes

- 3b293f2a: update svelte to 3.40 and vite-plugin-svelte to 1.0.0-next.14 ([#1992](https://github.com/sveltejs/kit/pull/1992))
- 34b923d1: [chore] stricter TypeScript checking ([#1989](https://github.com/sveltejs/kit/pull/1989))

## 1.0.0-next.134

### Patch Changes

- e1e5920a: [fix] correctly find links during prerendering ([#1984](https://github.com/sveltejs/kit/pull/1984))
- c7db715e: Handle errors with incorrect type ([#1983](https://github.com/sveltejs/kit/pull/1983))

## 1.0.0-next.133

### Patch Changes

- 68190496: chore: Vite to ^2.4.3, vite-plugin-svelte to ^1.0.0-next.13 ([#1969](https://github.com/sveltejs/kit/pull/1969))
- 0cbcd7c3: [fix] correctly detect external fetches ([#1980](https://github.com/sveltejs/kit/pull/1980))
- 51ec789f: Scrolling to an anchor via a hash now supports `scroll-*` CSS properties ([#1972](https://github.com/sveltejs/kit/pull/1972))

## 1.0.0-next.132

### Patch Changes

- 7b440b2b: Fix URL resolution for server-side fetch ([#1953](https://github.com/sveltejs/kit/pull/1953))

## 1.0.0-next.131

### Patch Changes

- 0bc1b309: Minor optimization in parse_body ([#1916](https://github.com/sveltejs/kit/pull/1916))

## 1.0.0-next.130

### Patch Changes

- 53e9285d: feat(config): Friendlier error messages for common errors ([#1910](https://github.com/sveltejs/kit/pull/1910))
- 41da1ebe: Handle 4xx and 5xx statuses without requiring `Error` instance ([#1811](https://github.com/sveltejs/kit/pull/1811))
- 073fc3b5: feat(cli): respect NODE_ENV when set by user ([#1915](https://github.com/sveltejs/kit/pull/1915))

## 1.0.0-next.129

### Patch Changes

- e246455: Passthrough server-side fetch cookies for most same-origin scenarios ([#1847](https://github.com/sveltejs/kit/pull/1847))

## 1.0.0-next.128

### Patch Changes

- 27e9067: Better error messages when something goes wrong while emitting types ([#1903](https://github.com/sveltejs/kit/pull/1903))
- 277029d: Change index.js exports to directory exports when packaging ([#1905](https://github.com/sveltejs/kit/pull/1905))

## 1.0.0-next.127

### Patch Changes

- bb3ae21: Fix endpoint validation to allow returning string for all content types ([#1900](https://github.com/sveltejs/kit/pull/1900))

## 1.0.0-next.126

### Patch Changes

- 4720b67: Default body parsing to binary ([#1890](https://github.com/sveltejs/kit/pull/1890))
- 6da07b8: fix returning null from endpoints ([#1886](https://github.com/sveltejs/kit/pull/1886))

## 1.0.0-next.125

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types ([#1687](https://github.com/sveltejs/kit/pull/1687))
- f854b89: Replace return type of Buffer with Uint8Array ([#1876](https://github.com/sveltejs/kit/pull/1876))
- f854b89: Remove Incoming from public types ([#1876](https://github.com/sveltejs/kit/pull/1876))

## 1.0.0-next.124

### Patch Changes

- 34d2049: handle undefined body on endpoint output ([#1808](https://github.com/sveltejs/kit/pull/1808))
- c826016: add config.kit.package.emitTypes ([#1852](https://github.com/sveltejs/kit/pull/1852))
- 8854e2f: Bump vite-plugin-svelte to 1.0.0-next.12 ([#1869](https://github.com/sveltejs/kit/pull/1869))
- af1aa54: copy essential root files on `svelte-kit package` ([#1747](https://github.com/sveltejs/kit/pull/1747))
- 872840a: Pass along custom properties added to Error ([#1821](https://github.com/sveltejs/kit/pull/1821))
- 868f97a: Preserve README casing and package.json contents on svelte-kit package ([#1735](https://github.com/sveltejs/kit/pull/1735))

## 1.0.0-next.123

### Patch Changes

- 4b25615: Fix ReadOnlyFormData keys and values method implementation ([#1837](https://github.com/sveltejs/kit/pull/1837))
- 64f749d: ServiceWorker files exclusion support available through svelte.config.js ([#1645](https://github.com/sveltejs/kit/pull/1645))
- 4d2fec5: Enable Vite's server.fs.strict by default ([#1842](https://github.com/sveltejs/kit/pull/1842))
- 1ec368a: Expose Vite.js mode from \$app/env ([#1789](https://github.com/sveltejs/kit/pull/1789))

## 1.0.0-next.122

### Patch Changes

- d09a4e1: Surface Svelte compiler errors ([#1827](https://github.com/sveltejs/kit/pull/1827))
- 79b4fe2: Update Vite to ^2.4.1 ([#1834](https://github.com/sveltejs/kit/pull/1834))
- 2ac5781: Use esbuild inject API to insert shims ([#1822](https://github.com/sveltejs/kit/pull/1822))

## 1.0.0-next.121

### Patch Changes

- 939188e: Use UTF-8 encoding for JSON endpoint responses by default ([#1669](https://github.com/sveltejs/kit/pull/1669))
- 5b3e1e6: Add types generation to svelte-kit package command ([#1646](https://github.com/sveltejs/kit/pull/1646))
- 8affef2: Fix type errors inside ReadOnlyFormData that didn't allow it to be used inside for..of loops ([#1830](https://github.com/sveltejs/kit/pull/1830))

## 1.0.0-next.120

### Patch Changes

- 9fbaeda: fix attribute validation in generated script tag ([#1768](https://github.com/sveltejs/kit/pull/1768))
- 9f0c54a: Externalize app initialization to adapters ([#1804](https://github.com/sveltejs/kit/pull/1804))
- 0d69e55: Add generic type for session ([#1791](https://github.com/sveltejs/kit/pull/1791))
- 325c223: Improve RequestHandler and EndpointOutput type declarations. ([#1778](https://github.com/sveltejs/kit/pull/1778))
- 6ef148d: Generate service worker registration code even with `router` and `hydration` disabled ([#1724](https://github.com/sveltejs/kit/pull/1724))
- ae3ef19: Fail if config.kit.appDir starts or ends with a slash ([#1695](https://github.com/sveltejs/kit/pull/1695))

## 1.0.0-next.119

### Patch Changes

- 064f848: Implement serverFetch hook
- 882fb12: Add keepfocus option to goto

## 1.0.0-next.118

### Patch Changes

- 5418254: Fix regex for getting links to crawl during prerendering ([#1743](https://github.com/sveltejs/kit/pull/1743))

## 1.0.0-next.117

### Patch Changes

- 828732c: Specify actual Svelte version requirement ([#1751](https://github.com/sveltejs/kit/pull/1751))

## 1.0.0-next.116

### Patch Changes

- ea8cd54: chore(kit): correct `engines` constraint ([#1696](https://github.com/sveltejs/kit/pull/1696))
- aedec24: Ensure router is initialized before parsing location ([#1691](https://github.com/sveltejs/kit/pull/1691))
- c7d5ce4: update vite to 2.3.8 and unpin ([#1715](https://github.com/sveltejs/kit/pull/1715))
- d259bca: Stricter regex for getting element attributes during prerendering ([#1700](https://github.com/sveltejs/kit/pull/1700))

## 1.0.0-next.115

### Patch Changes

- 523c3e2: Allow vite.alias to be an array ([#1640](https://github.com/sveltejs/kit/pull/1640))
- 6fd46d1: \* update vite-plugin-svelte to 1.0.0-next.11 and use its named export ([#1673](https://github.com/sveltejs/kit/pull/1673))
  - update vite to 2.3.7
- dc56d3c: Fix navigation when `base` path is set and validate that option's value ([#1666](https://github.com/sveltejs/kit/pull/1666))

## 1.0.0-next.114

### Patch Changes

- 5aa64ab: fix: SSL for HMR websockets #844 ([#1517](https://github.com/sveltejs/kit/pull/1517))
- fae75f1: add optional state parameter for goto function ([#1643](https://github.com/sveltejs/kit/pull/1643))
- fbd5f8a: package command can now transpile TypeScript files ([#1633](https://github.com/sveltejs/kit/pull/1633))

## 1.0.0-next.113

### Patch Changes

- 045c45c: update vite to 2.3.6 ([#1625](https://github.com/sveltejs/kit/pull/1625))

## 1.0.0-next.112

### Patch Changes

- cbe029e: Allow non-lowercase 'content-type' header in ssr fetch requests ([#1463](https://github.com/sveltejs/kit/pull/1463))
- 1bf1a02: Make it possible to type context, page params and props for LoadInput and LoadOutput ([#1447](https://github.com/sveltejs/kit/pull/1447))

## 1.0.0-next.111

### Patch Changes

- eae1b1d: Rename handle's render parameter to resolve ([#1566](https://github.com/sveltejs/kit/pull/1566))

## 1.0.0-next.110

### Patch Changes

- 6372690: Add svelte-kit package command ([#1499](https://github.com/sveltejs/kit/pull/1499))
- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s) ([#1528](https://github.com/sveltejs/kit/pull/1528))
- bf77940: bump `polka` and `sirv` dependency versions ([#1548](https://github.com/sveltejs/kit/pull/1548))
- 2172469: Upgrade to Vite 2.3.4 ([#1580](https://github.com/sveltejs/kit/pull/1580))
- 028abd9: Pass validated svelte config to adapter adapt function ([#1559](https://github.com/sveltejs/kit/pull/1559))

## 1.0.0-next.109

### Patch Changes

- 261ee1c: Update compatible Node versions ([#1470](https://github.com/sveltejs/kit/pull/1470))
- ec156c6: let hash only changes be handled by router ([#830](https://github.com/sveltejs/kit/pull/830))
- 586785d: Allow passing HTTPS key pair in Vite section of config ([#1456](https://github.com/sveltejs/kit/pull/1456))

## 1.0.0-next.108

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))
- 37fc04f: Ignore URLs that the app does not own ([#1487](https://github.com/sveltejs/kit/pull/1487))

## 1.0.0-next.107

### Patch Changes

- ad83d40: update vite to ^2.3.1 ([#1429](https://github.com/sveltejs/kit/pull/1429))

## 1.0.0-next.106

### Patch Changes

- fe0531d: temporarily pin vite to version 2.2.4 until issues with 2.3.0 are resolved ([#1423](https://github.com/sveltejs/kit/pull/1423))

## 1.0.0-next.105

### Patch Changes

- f3c50a0: Bump Vite to 2.3.0 ([#1413](https://github.com/sveltejs/kit/pull/1413))
- cfd6c3c: Use rendered CSS for AMP pages ([#1408](https://github.com/sveltejs/kit/pull/1408))
- 9a2cc0a: Add trailingSlash: 'never' | 'always' | 'ignore' option ([#1404](https://github.com/sveltejs/kit/pull/1404))

## 1.0.0-next.104

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node ([#1391](https://github.com/sveltejs/kit/pull/1391))

## 1.0.0-next.103

### Patch Changes

- 11e7840: Generate ETags for binary response bodies ([#1382](https://github.com/sveltejs/kit/pull/1382))
- 11e7840: Update request/response body types ([#1382](https://github.com/sveltejs/kit/pull/1382))
- 9e20873: Allow ServerResponse to have non-static set of headers ([#1375](https://github.com/sveltejs/kit/pull/1375))
- 2562ca0: Account for POST bodies when serializing fetches ([#1385](https://github.com/sveltejs/kit/pull/1385))

## 1.0.0-next.102

### Patch Changes

- b5ff7f5: Rename \$layout to \_\_layout etc ([#1370](https://github.com/sveltejs/kit/pull/1370))
- d871213: Make Vite a prod dep of SvelteKit ([#1374](https://github.com/sveltejs/kit/pull/1374))

## 1.0.0-next.101

### Patch Changes

- f5e626d: Reference Vite/Svelte types inside Kit types ([#1319](https://github.com/sveltejs/kit/pull/1319))

## 1.0.0-next.100

### Patch Changes

- 9890492: Use TypedArray.set to copy from Uint8Array when getting raw body in core/http ([#1349](https://github.com/sveltejs/kit/pull/1349))

## 1.0.0-next.99

### Patch Changes

- 051c026: Remove getContext in favour of request.locals ([#1332](https://github.com/sveltejs/kit/pull/1332))

## 1.0.0-next.98

### Patch Changes

- d279e36: Add invalidate(url) API for re-running load functions ([#1303](https://github.com/sveltejs/kit/pull/1303))

## 1.0.0-next.97

### Patch Changes

- 694f5de: Fixes `navigating` store type ([#1322](https://github.com/sveltejs/kit/pull/1322))
- 0befffb: Rename .svelte to .svelte-kit ([#1321](https://github.com/sveltejs/kit/pull/1321))
- c6fde99: Switch to ESM in config files ([#1323](https://github.com/sveltejs/kit/pull/1323))

## 1.0.0-next.96

### Patch Changes

- 63eff1a: Add prerendering to \$app/env typings ([#1316](https://github.com/sveltejs/kit/pull/1316))

## 1.0.0-next.95

### Patch Changes

- 16cca89: Export AdapterUtils type for use in adapters ([#1300](https://github.com/sveltejs/kit/pull/1300))
- f3ef93d: Not calling JSON.stringify on endpoint's body if it's a string and the content-type header denotes json ([#1272](https://github.com/sveltejs/kit/pull/1272))
- 5023e98: Remove 'Navigated to' text from announcer' ([#1305](https://github.com/sveltejs/kit/pull/1305))
- b4d0d6c: Normalize keys of headers from server side requests
- 08ebcb5: Add esm config support ([#936](https://github.com/sveltejs/kit/pull/936))
- 427e8e0: Validate template file on startup ([#1304](https://github.com/sveltejs/kit/pull/1304))

## 1.0.0-next.94

### Patch Changes

- 72c78a4: Handle URLs that need to be decoded ([#1273](https://github.com/sveltejs/kit/pull/1273))

## 1.0.0-next.93

### Patch Changes

- 353afa1: Disable FLoC by default ([#1267](https://github.com/sveltejs/kit/pull/1267))

## 1.0.0-next.92

### Patch Changes

- 354e384: Allow FormData to be passed as RequestHandler type Body argument ([#1256](https://github.com/sveltejs/kit/pull/1256))
- b1bfe83: Show error page on unknown initial path. Fixes #1190.

## 1.0.0-next.91

### Patch Changes

- 82955ec: fix: adapt to svelte ids without ?import in vite 2.2.3

## 1.0.0-next.90

### Patch Changes

- ac60208: Exit process after adapting ([#1212](https://github.com/sveltejs/kit/pull/1212))

## 1.0.0-next.89

### Patch Changes

- 927e63c: update the error message of prerender to optionally include the parent variable ([#1200](https://github.com/sveltejs/kit/pull/1200))

## 1.0.0-next.88

### Patch Changes

- 6f2b4a6: Remove references to npm start ([#1196](https://github.com/sveltejs/kit/pull/1196))

## 1.0.0-next.87

### Patch Changes

- 4131467: Prerender fallback page for SPAs ([#1181](https://github.com/sveltejs/kit/pull/1181))

## 1.0.0-next.86

### Patch Changes

- 2130087: Support multiple rel values on anchor tag ([#884](https://github.com/sveltejs/kit/pull/884))
- ba732ff: Report errors in hooks.js ([#1178](https://github.com/sveltejs/kit/pull/1178))
- a2f3f4b: Rename `start` to `preview` in the CLI and package scripts

## 1.0.0-next.85

### Patch Changes

- 4645ad5: Force Vite to bundle Svelte component libraries in SSR ([#1148](https://github.com/sveltejs/kit/pull/1148))
- abf0248: Fix \$service-worker types

## 1.0.0-next.84

### Patch Changes

- 5c2665f: Prevent ...rest parameters from swallowing earlier characters ([#1128](https://github.com/sveltejs/kit/pull/1128))
- 4e1c4ea: Omit modulepreload links from pages with no JS ([#1131](https://github.com/sveltejs/kit/pull/1131))
- 5d864a6: Fix RequestHandler return type
- e1313d0: Make response.body optional

## 1.0.0-next.83

### Patch Changes

- a4a1075: Work around apparent Cloudflare Workers platform bugs ([#1123](https://github.com/sveltejs/kit/pull/1123))

## 1.0.0-next.82

### Patch Changes

- 4af45e1: Remove usage of node built-ins from runtime ([#1117](https://github.com/sveltejs/kit/pull/1117))

## 1.0.0-next.81

### Patch Changes

- 1237eb3: Expose rawBody on request, and expect rawBody from adapters ([#1109](https://github.com/sveltejs/kit/pull/1109))
- 1237eb3: Expose getRawBody from kit/http ([#1109](https://github.com/sveltejs/kit/pull/1109))

## 1.0.0-next.80

### Patch Changes

- 7a4b351: Expose install-fetch subpackage for adapters to use ([#1091](https://github.com/sveltejs/kit/pull/1091))

## 1.0.0-next.79

### Patch Changes

- d3abd97: Fix Windows build output containing backward slashes ([#1096](https://github.com/sveltejs/kit/pull/1096))

## 1.0.0-next.78

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([#1066](https://github.com/sveltejs/kit/pull/1066))
- 61d7fa0: Better error logging ([#1062](https://github.com/sveltejs/kit/pull/1062))
- 041b706: Implement layout resets ([#1061](https://github.com/sveltejs/kit/pull/1061))
- 148819a: Use latest vite-plugin-svelte ([#1057](https://github.com/sveltejs/kit/pull/1057))
- 9d54eed: Make sveltekit:prefetch a noop if <a> has no href ([#1060](https://github.com/sveltejs/kit/pull/1060))

## 1.0.0-next.77

### Patch Changes

- fee388a: Include CSS for entry point/generated component ([#1053](https://github.com/sveltejs/kit/pull/1053))

## 1.0.0-next.76

### Patch Changes

- f870909: Pin vite-plugin-svelte version ([#1026](https://github.com/sveltejs/kit/pull/1026))
- de2466f: Fix stale prerendering bug ([#1040](https://github.com/sveltejs/kit/pull/1040))

## 1.0.0-next.75

### Patch Changes

- 0c02dc0: Use global URLSearchParams instead of import from node url ([#1020](https://github.com/sveltejs/kit/pull/1020))
- 8021d6b: Fix default error page ([#1021](https://github.com/sveltejs/kit/pull/1021))
- 11ec751: Fix build warnings about missing exports in hooks file ([#1003](https://github.com/sveltejs/kit/pull/1003))

## 1.0.0-next.74

### Patch Changes

- 4c45784: Add ambient types to published files ([#980](https://github.com/sveltejs/kit/pull/980))

## 1.0.0-next.73

### Patch Changes

- 1007f67: Allow non-root \$error.svelte components ([#901](https://github.com/sveltejs/kit/pull/901))
- ca108a6: Change `handle` hook from positional arguments to named arguments ([#959](https://github.com/sveltejs/kit/pull/959))

## 1.0.0-next.72

### Patch Changes

- 1d5228c: Make --open option work with --https ([#921](https://github.com/sveltejs/kit/pull/921))
- 39b6967: Add ambient type definitions for \$app imports ([#917](https://github.com/sveltejs/kit/pull/917))
- 1d5228c: Make --open option work on WSL ([#921](https://github.com/sveltejs/kit/pull/921))
- bb2d97d: Fix argument type for RequestHandler ([#914](https://github.com/sveltejs/kit/pull/914))

## 1.0.0-next.71

### Patch Changes

- 108c26c: Always return a response from render function in handle ([#847](https://github.com/sveltejs/kit/pull/847))

## 1.0.0-next.70

### Patch Changes

- 6d9f7b1: Only include CSS on an SSR'd page ([#839](https://github.com/sveltejs/kit/pull/839))
- 6ecfa2c: Remove duplicate &lt;style&gt; element ([#845](https://github.com/sveltejs/kit/pull/845))

## 1.0.0-next.69

### Patch Changes

- 4d2cd62: Add prerendering to \$app/env ([#833](https://github.com/sveltejs/kit/pull/833))
- e2eeeea: Call load when path changes if page.path is used ([#838](https://github.com/sveltejs/kit/pull/838))
- 50b5526: Pass through credentials when fetching in load ([#835](https://github.com/sveltejs/kit/pull/835))
- 6384af6: Only inline data if hydrate=true ([#837](https://github.com/sveltejs/kit/pull/837))

## 1.0.0-next.68

### Patch Changes

- 24fab19: Add --https flag to dev and start ([#462](https://github.com/sveltejs/kit/pull/462))
- ba4f9b7: Check port, only expose to network with --host flag ([#819](https://github.com/sveltejs/kit/pull/819))

## 1.0.0-next.67

### Patch Changes

- 679e997: Fix client-side redirect loop detection ([#811](https://github.com/sveltejs/kit/pull/811))
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it ([#787](https://github.com/sveltejs/kit/pull/787))
- 78aec0c: Detect service worker support
- f33a22c: Make ...rest parameters optional ([#768](https://github.com/sveltejs/kit/pull/768))

## 1.0.0-next.66

### Patch Changes

- d9ce2a2: Correct response type for fetch ([#799](https://github.com/sveltejs/kit/pull/799))

## 1.0.0-next.65

### Patch Changes

- c0b9873: Always apply layout props when hydrating ([#794](https://github.com/sveltejs/kit/pull/794))
- b8a8e53: Add type to config.kit.vite ([#786](https://github.com/sveltejs/kit/pull/786))
- 9b09bcc: Prevent XSS when serializing fetch results ([#769](https://github.com/sveltejs/kit/pull/769))

## 1.0.0-next.64

### Patch Changes

- 7f58512: Prevent Vite prebundling from crashing on startup ([#759](https://github.com/sveltejs/kit/pull/759))

## 1.0.0-next.63

### Patch Changes

- 31f94fe: Add ssr, router and hydrate options

## 1.0.0-next.62

### Patch Changes

- 864c3d4: Assets imported from css and js/ts files are emitted as files instead of being inlined ([#461](https://github.com/sveltejs/kit/pull/461))

## 1.0.0-next.61

### Patch Changes

- 4b2c97e: Initialise router with history.state

## 1.0.0-next.60

### Patch Changes

- 84e9023: Fix host property ([#657](https://github.com/sveltejs/kit/pull/657))
- 272148b: Rename \$service-worker::assets to files, per the docs ([#658](https://github.com/sveltejs/kit/pull/658))
- d5071c5: Hydrate initial page before starting router ([#654](https://github.com/sveltejs/kit/pull/654))
- 4a1c04a: More accurate MODULE_NOT_FOUND errors ([#665](https://github.com/sveltejs/kit/pull/665))
- d881b7e: Replace setup with hooks ([#670](https://github.com/sveltejs/kit/pull/670))

## 1.0.0-next.59

### Patch Changes

- 826f39e: Make prefetching work ([#620](https://github.com/sveltejs/kit/pull/620))

## 1.0.0-next.58

### Patch Changes

- 26893b0: Allow first argument to fetch in load to be a request ([#619](https://github.com/sveltejs/kit/pull/619))
- 924db15: Add copy function to Builder.js ([#630](https://github.com/sveltejs/kit/pull/630))

## 1.0.0-next.57

### Patch Changes

- 391189f: Check for options.initiator in correct place ([#615](https://github.com/sveltejs/kit/pull/615))

## 1.0.0-next.56

### Patch Changes

- 82cbe2b: Shrink client manifest ([#593](https://github.com/sveltejs/kit/pull/593))
- 8024178: remove @sveltejs/app-utils ([#600](https://github.com/sveltejs/kit/pull/600))

## 1.0.0-next.55

### Patch Changes

- d0a7019: switch to @sveltejs/vite-plugin-svelte ([#584](https://github.com/sveltejs/kit/pull/584))
- 8a88fad: Replace regex routes with fallthrough routes ([#583](https://github.com/sveltejs/kit/pull/583))

## 1.0.0-next.54

### Patch Changes

- 3037530: Create history entry for initial route ([#582](https://github.com/sveltejs/kit/pull/582))
- 04f17f5: Prevent erronous <style>undefined</style> ([#578](https://github.com/sveltejs/kit/pull/578))
- 8805c6d: Pass adapters directly to svelte.config.cjs ([#579](https://github.com/sveltejs/kit/pull/579))

## 1.0.0-next.53

### Patch Changes

- 9cf2f21: Only require page components to export prerender ([#577](https://github.com/sveltejs/kit/pull/577))
- e860de0: Invalidate page when query changes ([#575](https://github.com/sveltejs/kit/pull/575))
- 7bb1cf0: Disable vite-plugin-svelte transform cache ([#576](https://github.com/sveltejs/kit/pull/576))

## 1.0.0-next.52

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs ([#569](https://github.com/sveltejs/kit/pull/569))

## 1.0.0-next.51

### Patch Changes

- 34a00f9: Bypass router on hydration ([#563](https://github.com/sveltejs/kit/pull/563))

## 1.0.0-next.50

### Patch Changes

- 0512fd1: Remove startGlobal option ([#559](https://github.com/sveltejs/kit/pull/559))
- 9212aa5: Add options to adapter-node, and add adapter types ([#531](https://github.com/sveltejs/kit/pull/531))
- 0512fd1: Fire custom events for start, and navigation start/end ([#559](https://github.com/sveltejs/kit/pull/559))

## 1.0.0-next.49

### Patch Changes

- ab28c0a: kit: include missing types.d.ts ([#538](https://github.com/sveltejs/kit/pull/538))
- c76c9bf: Upgrade Vite ([#544](https://github.com/sveltejs/kit/pull/544))

## 1.0.0-next.48

### Patch Changes

- e37a302: Make getSession future-proof ([#524](https://github.com/sveltejs/kit/pull/524))

## 1.0.0-next.47

### Patch Changes

- 5554acc: Add \$lib alias ([#511](https://github.com/sveltejs/kit/pull/511))
- 5cd6f11: bump vite-plugin-svelte to 0.11.0 ([#513](https://github.com/sveltejs/kit/pull/513))

## 1.0.0-next.46

### Patch Changes

- f35a5cd: Change adapter signature ([#505](https://github.com/sveltejs/kit/pull/505))

## 1.0.0-next.45

### Patch Changes

- 925638a: Remove endpoints from the files built for the client ([#490](https://github.com/sveltejs/kit/pull/490))
- c3cf3f3: Bump deps ([#492](https://github.com/sveltejs/kit/pull/492))
- 625747d: kit: bundle @sveltejs/kit into built application ([#486](https://github.com/sveltejs/kit/pull/486))
- Updated dependencies [c3cf3f3]
  - @sveltejs/vite-plugin-svelte@1.0.0-next.3

## 1.0.0-next.44

### Patch Changes

- e6449d2: Fix AMP styles for real ([#494](https://github.com/sveltejs/kit/pull/494))

## 1.0.0-next.43

### Patch Changes

- 672e9be: Fix AMP styles, again ([#491](https://github.com/sveltejs/kit/pull/491))

## 1.0.0-next.42

### Patch Changes

- 0f54ebc: Fix AMP styles ([#488](https://github.com/sveltejs/kit/pull/488))

## 1.0.0-next.41

### Patch Changes

- 4aa5a73: Future-proof prepare argument ([#471](https://github.com/sveltejs/kit/pull/471))
- 58dc400: Call correct set_paths function ([#487](https://github.com/sveltejs/kit/pull/487))
- 2322291: Update to node-fetch@3

## 1.0.0-next.40

### Patch Changes

- 4c5fd3c: Include layout/error styles in SSR ([#472](https://github.com/sveltejs/kit/pull/472))

## 1.0.0-next.39

### Patch Changes

- b7fdb0d: Skip pre-bundling ([#468](https://github.com/sveltejs/kit/pull/468))

## 1.0.0-next.38

### Patch Changes

- 15402b1: Add service worker support ([#463](https://github.com/sveltejs/kit/pull/463))
- 0c630b5: Ignore dynamically imported components when constructing styles in dev mode ([#443](https://github.com/sveltejs/kit/pull/443))
- ac06af5: Fix svelte-kit adapt for Windows ([#435](https://github.com/sveltejs/kit/pull/435))
- 061fa46: Implement improved redirect API
- b800049: Include type declarations ([#442](https://github.com/sveltejs/kit/pull/442))
- 07c6de4: Use posix paths in manifest even on Windows ([#436](https://github.com/sveltejs/kit/pull/436))
- 27ba872: Error if preload function exists ([#455](https://github.com/sveltejs/kit/pull/455))
- 0c630b5: Add default paths in case singletons module is invalidated ([#443](https://github.com/sveltejs/kit/pull/443))
- 73dd998: Allow custom extensions ([#411](https://github.com/sveltejs/kit/pull/411))

## 1.0.0-next.37

### Patch Changes

- 230c6d9: Indicate which request failed, if fetch fails inside load function ([#427](https://github.com/sveltejs/kit/pull/427))
- f1bc218: Run adapt via svelte-kit build ([#430](https://github.com/sveltejs/kit/pull/430))
- 6850ddc: Fix svelte-kit start for Windows ([#425](https://github.com/sveltejs/kit/pull/425))

## 1.0.0-next.36

### Patch Changes

- 7b70a33: Force version bump so that Kit uses updated vite-plugin-svelte ([#419](https://github.com/sveltejs/kit/pull/419))

## 1.0.0-next.35

### Patch Changes

- Use Vite
- Fix Windows issues
- Preserve load context during navigation
- Return error from load

## 1.0.0-next.34

### Patch Changes

- Fix adapters and convert to ES modules

## 1.0.0-next.33

### Patch Changes

- 474070e: Better errors when modules cannot be found ([#381](https://github.com/sveltejs/kit/pull/381))

## 1.0.0-next.32

### Patch Changes

- Convert everything to ESM

## 1.0.0-next.31

### Patch Changes

- b6c2434: app.js -> app.cjs ([#362](https://github.com/sveltejs/kit/pull/362))

## 1.0.0-next.30

### Patch Changes

- 00cbaf6: Rename _.config.js to _.config.cjs ([#356](https://github.com/sveltejs/kit/pull/356))

## 1.0.0-next.29

### Patch Changes

- 4c0edce: Use addEventListener instead of onload ([#347](https://github.com/sveltejs/kit/pull/347))

## 1.0.0-next.28

### Patch Changes

- 4353025: Prevent infinite loop when fetching bad URLs inside error responses ([#340](https://github.com/sveltejs/kit/pull/340))
- 2860065: Handle assets path when prerendering ([#341](https://github.com/sveltejs/kit/pull/341))

## 1.0.0-next.27

### Patch Changes

- Fail build if prerender errors
- Hide logging behind --verbose option

## 1.0.0-next.26

### Patch Changes

- Fix svelte-announcer CSS

## 1.0.0-next.25

### Patch Changes

- Surface stack traces for endpoint/page rendering errors

## 1.0.0-next.24

### Patch Changes

- 26643df: Account for config.paths when prerendering ([#322](https://github.com/sveltejs/kit/pull/322))

## 1.0.0-next.23

### Patch Changes

- 9b758aa: Upgrade to Snowpack 3 ([#321](https://github.com/sveltejs/kit/pull/321))

## 1.0.0-next.22

### Patch Changes

- bb68595: use readFileSync instead of createReadStream ([#320](https://github.com/sveltejs/kit/pull/320))

## 1.0.0-next.21

### Patch Changes

- 217e4cc: Set paths to empty string before prerender ([#317](https://github.com/sveltejs/kit/pull/317))

## 1.0.0-next.20

### Patch Changes

- ccf4aa7: Implement prerender config ([#315](https://github.com/sveltejs/kit/pull/315))

## 1.0.0-next.19

### Patch Changes

- deda984: Make navigating store contain from and to properties ([#313](https://github.com/sveltejs/kit/pull/313))

## 1.0.0-next.18

### Patch Changes

- c29b61e: Announce page changes ([#311](https://github.com/sveltejs/kit/pull/311))
- 72da270: Reset focus properly ([#309](https://github.com/sveltejs/kit/pull/309))

## 1.0.0-next.17

### Patch Changes

- f7dea55: Set process.env.NODE_ENV when invoking via the CLI ([#304](https://github.com/sveltejs/kit/pull/304))

## 1.0.0-next.16

### Patch Changes

- Remove temporary logging
- Add sveltekit:prefetch and sveltekit:noscroll

## 1.0.0-next.15

### Patch Changes

- 6d1bb11: Fix AMP CSS ([#286](https://github.com/sveltejs/kit/pull/286))
- d8b53af: Ignore $layout and $error files when finding static paths
- Better scroll tracking

## 1.0.0-next.14

### Patch Changes

- Fix dev loader

## 1.0.0-next.13

### Patch Changes

- 1ea4d6b: More robust CSS extraction ([#279](https://github.com/sveltejs/kit/pull/279))

## 1.0.0-next.12

### Patch Changes

- e7c88dd: Tweak AMP validation screen

## 1.0.0-next.11

### Patch Changes

- a31f218: Fix SSR loader invalidation ([#277](https://github.com/sveltejs/kit/pull/277))

## 1.0.0-next.10

### Patch Changes

- 8b14d29: Omit svelte-data scripts from AMP pages ([#276](https://github.com/sveltejs/kit/pull/276))

## 1.0.0-next.9

### Patch Changes

- f5fa223: AMP support ([#274](https://github.com/sveltejs/kit/pull/274))
- 47f2ee1: Always remove trailing slashes ([#267](https://github.com/sveltejs/kit/pull/267))
- 1becb94: Replace preload with load

## 1.0.0-next.8

### Patch Changes

- 15dd751: Use meta http-equiv=refresh ([#256](https://github.com/sveltejs/kit/pull/256))
- be7e031: Fix handling of static files ([#258](https://github.com/sveltejs/kit/pull/258))
- ed6b8fd: Implement \$app/env ([#251](https://github.com/sveltejs/kit/pull/251))

## 1.0.0-next.7

### Patch Changes

- 76705b0: make HMR work outside localhost ([#246](https://github.com/sveltejs/kit/pull/246))

## 1.0.0-next.6

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files ([#236](https://github.com/sveltejs/kit/pull/236))
- fa7f2b2: Implement live bindings for SSR code ([#245](https://github.com/sveltejs/kit/pull/245))

## 1.0.0-next.5

### Patch Changes

- Return dependencies from render

## 1.0.0-next.4

### Patch Changes

- af01b0d: Move renderer out of app assets folder

## 1.0.0-next.3

### Patch Changes

- Add paths to manifest, for static prerendering

## 1.0.0-next.2

### Patch Changes

- Fix typo causing misnamed assets folder

## 1.0.0-next.1

### Patch Changes

- a4bc090: Transform exported functions correctly ([#225](https://github.com/sveltejs/kit/pull/225))
- 00bbf98: Fix nested layouts ([#227](https://github.com/sveltejs/kit/pull/227))

## 0.0.31-next.0

### Patch Changes

- ffd7bba: Fix SSR cache invalidation ([#217](https://github.com/sveltejs/kit/pull/217))

## 0.0.30

### Patch Changes

- Add back stores(), but with deprecation warning
- Rename stores.preloading to stores.navigating
- Rewrite routing logic

## 0.0.29

### Patch Changes

- 10872cc: Normalize request.query ([#196](https://github.com/sveltejs/kit/pull/196))

## 0.0.28

### Patch Changes

- Add svelte-kit start command

## 0.0.27

### Patch Changes

- rename CLI to svelte-kit
- 0904e22: rename svelte CLI to svelte-kit ([#186](https://github.com/sveltejs/kit/pull/186))
- Validate route responses
- Make paths and target configurable

## 0.0.26

### Patch Changes

- b475ed4: Overhaul adapter API - fixes #166 ([#180](https://github.com/sveltejs/kit/pull/180))
- Updated dependencies [b475ed4]
  - @sveltejs/app-utils@0.0.18

## 0.0.25

### Patch Changes

- Updated dependencies [3bdf33b]
  - @sveltejs/app-utils@0.0.17

## 0.0.24

### Patch Changes

- 67eaeea: Move app-utils stuff into subpackages
- 7f8df30: Move kit runtime code, expose via \$app aliases
- Updated dependencies [67eaeea]
  - @sveltejs/app-utils@0.0.16

## 0.0.23

### Patch Changes

- a163000: Parse body on incoming requests
- a346eab: Copy over latest Sapper router code ([#6](https://github.com/sveltejs/kit/pull/6))
- Updated dependencies [a163000]
  - @sveltejs/app-utils@0.0.15

## 0.0.22

### Patch Changes

- Force bump version

## 0.0.21

### Patch Changes

- Build setup entry point
- Work around pkg.exports constraint
- Respond with 500s if render fails
- Updated dependencies [undefined]
- Updated dependencies [undefined]
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.14

## 0.0.20

### Patch Changes

- Pass setup module to renderer
- Bump Snowpack version
- Updated dependencies [undefined]
- Updated dependencies [96c06d8]
  - @sveltejs/app-utils@0.0.13

## 0.0.19

### Patch Changes

- fa9d7ce: Handle import.meta in SSR module loader
- 0320208: Rename 'server route' to 'endpoint'
- b9444d2: Update to Snowpack 2.15
- 5ca907c: Use shared mkdirp helper
- Updated dependencies [0320208]
- Updated dependencies [5ca907c]
  - @sveltejs/app-utils@0.0.12

## 0.0.18

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.11

## 0.0.17

### Patch Changes

- 19323e9: Update Snowpack
- Updated dependencies [19323e9]
  - @sveltejs/app-utils@0.0.10

## 0.0.16

### Patch Changes

- Updated dependencies [90a98ae]
  - @sveltejs/app-utils@0.0.9

## 0.0.15

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.8

## 0.0.14

### Patch Changes

- various
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.7
