# @sveltejs/kit

## 1.22.5

### Patch Changes

- fix: make server assets available during `vite preview` ([#10511](https://github.com/sveltejs/kit/pull/10511))

- chore: upgrade `undici` to 5.23.0 ([#10240](https://github.com/sveltejs/kit/pull/10240))

## 1.22.4

### Patch Changes

- fix: prevent duplicate module preload ([#10442](https://github.com/sveltejs/kit/pull/10442))

- docs: Elaborate on credentialed `fetch` behaviour ([#10421](https://github.com/sveltejs/kit/pull/10421))

## 1.22.3

### Patch Changes

- fix: gracefully handle server endpoints that return `Response`s with immutable `Headers` ([#10367](https://github.com/sveltejs/kit/pull/10367))

## 1.22.2

### Patch Changes

- fix: wait a tick before announcing new page title ([#10363](https://github.com/sveltejs/kit/pull/10363))

- feat: more helpful error for preview if build output doesn't exist ([#10337](https://github.com/sveltejs/kit/pull/10337))

## 1.22.1

### Patch Changes

- perf: only have Vite generate relative paths when required ([#10287](https://github.com/sveltejs/kit/pull/10287))

## 1.22.0

### Minor Changes

- feat: add `HEAD` server method ([#9753](https://github.com/sveltejs/kit/pull/9753))

- feat: support caching of responses with `Vary` header (except for `Vary: *`) ([#9993](https://github.com/sveltejs/kit/pull/9993))

### Patch Changes

- fix: avoid running load function on invalid requests ([#9752](https://github.com/sveltejs/kit/pull/9752))

- fix: update page store when URL hash is changed from the address bar ([#10202](https://github.com/sveltejs/kit/pull/10202))

- fix: include `Vary: Accept` header to fix browser caching of adjacent pages and endpoints ([#9993](https://github.com/sveltejs/kit/pull/9993))

## 1.21.0

### Minor Changes

- feat: add `event.isSubRequest` boolean indicating whether this is a call to one of the app's own APIs during SSR (or prerendering) ([#10170](https://github.com/sveltejs/kit/pull/10170))

- feat: add `privatePrefix` to `config.kit.env` ([#9996](https://github.com/sveltejs/kit/pull/9996))

- feat: export `VERSION` from `@sveltejs/kit` ([#9969](https://github.com/sveltejs/kit/pull/9969))

### Patch Changes

- docs: update inline NavigationType documentation ([#10269](https://github.com/sveltejs/kit/pull/10269))

- perf: cache dynamic imports of nodes ([#10080](https://github.com/sveltejs/kit/pull/10080))

## 1.20.5

### Patch Changes

- fix: batch synchronous invalidate invocations ([#10145](https://github.com/sveltejs/kit/pull/10145))

- fix: allow rest params to be empty in resolvePath ([#10146](https://github.com/sveltejs/kit/pull/10146))

- fix: correctly close dialogs when form is enhanced ([#10093](https://github.com/sveltejs/kit/pull/10093))

- fix: precompress filter ([#10185](https://github.com/sveltejs/kit/pull/10185))

## 1.20.4

### Patch Changes

- fix: remove reference to tiny-glob from postinstall script ([#10174](https://github.com/sveltejs/kit/pull/10174))

## 1.20.3

### Patch Changes

- chore: remove `tiny-glob` as a dependency ([#10166](https://github.com/sveltejs/kit/pull/10166))

- fix: don't import types from `svelte/internal` ([#10172](https://github.com/sveltejs/kit/pull/10172))

- fix: don't skip rest parameter's matcher when there is a non-matching optional parameter ([#10020](https://github.com/sveltejs/kit/pull/10020))

- fix: ensure `fetch` respects headers from provided `Request` ([#10136](https://github.com/sveltejs/kit/pull/10136))

## 1.20.2

### Patch Changes

- fix: ensure optional routes with matchers and catch-all match correctly ([#9987](https://github.com/sveltejs/kit/pull/9987))

- fix: disallow `actions` export from a `+layout.server` file ([#10046](https://github.com/sveltejs/kit/pull/10046))

- fix: remove scrollbars from default error page ([#10059](https://github.com/sveltejs/kit/pull/10059))

## 1.20.1

### Patch Changes

- fix: don't copy public folder in service worker build ([#10082](https://github.com/sveltejs/kit/pull/10082))

## 1.20.0

### Minor Changes

- feat: support Svelte 4 ([#10048](https://github.com/sveltejs/kit/pull/10048))

## 1.19.0

### Minor Changes

- feat: allow link options to be set to `"true"` and `"false"` ([#10039](https://github.com/sveltejs/kit/pull/10039))

- feat: add `resolvePath` export for building relative paths from route IDs and parameters ([#9949](https://github.com/sveltejs/kit/pull/9949))

### Patch Changes

- fix: prevent history change when clicking same hash link ([#10032](https://github.com/sveltejs/kit/pull/10032))

- fix: gracefully handle server endpoints that return `Response`s with immutable `Headers` when prerendering ([#10030](https://github.com/sveltejs/kit/pull/10030))

- fix: do not add content-security-policy meta element if content is empty ([#10026](https://github.com/sveltejs/kit/pull/10026))

- docs: correct `ResolveOptions['preload']` inline documentation ([#10037](https://github.com/sveltejs/kit/pull/10037))

- fix: avoid creating update check timer on the server ([#10015](https://github.com/sveltejs/kit/pull/10015))

## 1.18.0

### Minor Changes

- security: Stop implicitly tracking URLs as dependencies in server-side `load`s ([#9945](https://github.com/sveltejs/kit/pull/9945))

## 1.17.1

### Patch Changes

- fix: ensure styles are loaded in dev mode for routes containing special characters ([#9894](https://github.com/sveltejs/kit/pull/9894))

- feat: warn users when enhancing forms with files but no `enctype="multipart/form-data"` ([#9888](https://github.com/sveltejs/kit/pull/9888))

## 1.17.0

### Minor Changes

- feat: unshadow `data` and `form` in `enhance` and warn about future deprecation when used in `dev` mode ([#9902](https://github.com/sveltejs/kit/pull/9902))

- feat: crawl URLs in `<meta>` tags ([#9900](https://github.com/sveltejs/kit/pull/9900))

### Patch Changes

- fix: avoid trying to inline raw or url css imports ([#9925](https://github.com/sveltejs/kit/pull/9925))

- feat: prerender in worker rather than subprocess to support Deno ([#9919](https://github.com/sveltejs/kit/pull/9919))

- perf: add `<script>` to prerendered redirects for faster redirects ([#9911](https://github.com/sveltejs/kit/pull/9911))

- fix: add typing for `vitePlugin` to `Config` ([#9946](https://github.com/sveltejs/kit/pull/9946))

- fix: stop setting Kit cookie defaults on cookies parsed from headers ([#9908](https://github.com/sveltejs/kit/pull/9908))

- fix: only skip hydration with vite overlay if current page is an error ([#9892](https://github.com/sveltejs/kit/pull/9892))

## 1.16.3

### Patch Changes

- fix: entry generation with mixed segments ([#9879](https://github.com/sveltejs/kit/pull/9879))

- fix: use `focusVisible: false` to prevent unwanted focus ring on navigation ([#9861](https://github.com/sveltejs/kit/pull/9861))

## 1.16.2

### Patch Changes

- fix: support Node 20 ([`6e2efcf62`](https://github.com/sveltejs/kit/commit/6e2efcf627ce8d179c941212d761aa93568b1724))

- fix: reset focus synchronously on navigation ([#9837](https://github.com/sveltejs/kit/pull/9837))

## 1.16.1

### Patch Changes

- fix: realign state.branch on the client on first load ([#9754](https://github.com/sveltejs/kit/pull/9754))

- fix: update `$page.data` correctly after invalidate ([#9798](https://github.com/sveltejs/kit/pull/9798))

- fix: file not found in manifest ([#9846](https://github.com/sveltejs/kit/pull/9846))

## 1.16.0

### Minor Changes

- feat: route-level entry generators via `export const entries` ([#9571](https://github.com/sveltejs/kit/pull/9571))

## 1.15.11

### Patch Changes

- chore: more compact representation for invalidated search param ([#9708](https://github.com/sveltejs/kit/pull/9708))

- chore: fix import path to app script on windows ([#9743](https://github.com/sveltejs/kit/pull/9743))

- fix: make $app/navigation more resilient to bundler reordering ([#9808](https://github.com/sveltejs/kit/pull/9808))

- fix: page load `fetch()` now accepts the same input types for the body as the native fetch function ([#9801](https://github.com/sveltejs/kit/pull/9801))

- fix: handle preload and filterSerializedResponseHeaders in sequence function ([#9741](https://github.com/sveltejs/kit/pull/9741))

## 1.15.10

### Patch Changes

- fix: log whole error object in default handleError ([#9791](https://github.com/sveltejs/kit/pull/9791))

## 1.15.9

### Patch Changes

- fix: correctly replace state when `data-sveltekit-replacestate` is used with a hash link ([#9751](https://github.com/sveltejs/kit/pull/9751))

- fix: compute trailing slash on page server / data request ([#9738](https://github.com/sveltejs/kit/pull/9738))

- fix: update vite-plugin-svelte to fix windows resolution issue ([#9769](https://github.com/sveltejs/kit/pull/9769))

## 1.15.8

### Patch Changes

- chore: revert undici pin and upgrade version ([#9740](https://github.com/sveltejs/kit/pull/9740))

- chore: upgrade vite-plugin-svelte for resolve improvements and warnings ([#9742](https://github.com/sveltejs/kit/pull/9742))

## 1.15.7

### Patch Changes

- fix: provide better error when prerendered routes conflict with each other ([#9692](https://github.com/sveltejs/kit/pull/9692))

- fix: prevent false positive warnings for fetch in Firefox and Safari ([#9680](https://github.com/sveltejs/kit/pull/9680))

- fix: allow embedding two pages generated into the same page in "embedded" mode ([#9610](https://github.com/sveltejs/kit/pull/9610))

- fix: don't include prerendered routes in default generateManifest ([#9471](https://github.com/sveltejs/kit/pull/9471))

- fix: better error messages for handleable prerender failures ([#9621](https://github.com/sveltejs/kit/pull/9621))

## 1.15.6

### Patch Changes

- fix: use correct relative paths when rendering base path ([#9343](https://github.com/sveltejs/kit/pull/9343))

- fix: handle redirect thrown in handle hook in response to form action ([#9658](https://github.com/sveltejs/kit/pull/9658))

- fix: do not call beforeNavigate for download links ([#9660](https://github.com/sveltejs/kit/pull/9660))

## 1.15.5

### Patch Changes

- fix: correct allow header methods list for 405s ([#9655](https://github.com/sveltejs/kit/pull/9655))

- fix: prevent routes/layouts from having conflicting files through resets or different extensions ([#9590](https://github.com/sveltejs/kit/pull/9590))

- fix: prevent unhandled exceptions for invalid header values ([#9638](https://github.com/sveltejs/kit/pull/9638))

## 1.15.4

### Patch Changes

- fix: gracefully handle failure to load hooks.server.js ([#9641](https://github.com/sveltejs/kit/pull/9641))

- feat: set sourcemapIgnoreList to filter out non-source directories ([#9619](https://github.com/sveltejs/kit/pull/9619))

## 1.15.3

### Patch Changes

- fix: prevent building duplicate CSS files ([#9382](https://github.com/sveltejs/kit/pull/9382))

## 1.15.2

### Patch Changes

- fix: address security advisory [CVE-2023-29008](https://github.com/sveltejs/kit/security/advisories/GHSA-gv7g-x59x-wf8f) by doing a case-insensitive comparison when checking header value ([`ba436c66`](https://github.com/sveltejs/kit/commit/ba436c6685e751d968a960fbda65f24cf7a82e9f))

## 1.15.1

### Patch Changes

- fix: pin undici to 5.20.0 ([#9591](https://github.com/sveltejs/kit/pull/9591))

- fix: address security advisory [CVE-2023-29003](https://github.com/sveltejs/kit/security/advisories/GHSA-5p75-vc5g-8rv2) by including `text/plain` and `PUT`/`PATCH`/`DELETE` requests in set of blocked cross-origin requests for CSRF protection ([`bb2253d5`](https://github.com/sveltejs/kit/commit/bb2253d51d00aba2e4353952d4fb0dcde6c77123))

## 1.15.0

### Minor Changes

- feat: expose stronger typed `SubmitFunction` through `./$types` ([#9201](https://github.com/sveltejs/kit/pull/9201))

### Patch Changes

- fix: throw error when file can't be found in Vite manifest ([#9558](https://github.com/sveltejs/kit/pull/9558))

- fix: make `error.message` enumerable when sending `ssrLoadModule` error to client ([#9440](https://github.com/sveltejs/kit/pull/9440))

- fix: pass `publicDir` Vite config in SSR ([#9565](https://github.com/sveltejs/kit/pull/9565))

- fix: balance parentheses in error about wrong content type for action ([#9513](https://github.com/sveltejs/kit/pull/9513))

## 1.14.0

### Minor Changes

- feat: add HMR to fallback error pages during dev ([#9497](https://github.com/sveltejs/kit/pull/9497))

### Patch Changes

- fix: add `submitter` type to `SumbitFunction` ([#9484](https://github.com/sveltejs/kit/pull/9484))

## 1.13.0

### Minor Changes

- feat: add dark mode styles to default error page ([#9460](https://github.com/sveltejs/kit/pull/9460))

### Patch Changes

- fix: recover from errors during dev by reloading ([#9441](https://github.com/sveltejs/kit/pull/9441))

## 1.12.0

### Minor Changes

- feat: expose submitter in use:enhance SubmitFunction ([#9425](https://github.com/sveltejs/kit/pull/9425))

- feat: add data-sveltekit-keepfocus and data-sveltekit-replacestate options to links (requires Svelte version 3.56 for type-checking with `svelte-check`) ([#9019](https://github.com/sveltejs/kit/pull/9019))

### Patch Changes

- fix: don't start debugger on 404s ([#9424](https://github.com/sveltejs/kit/pull/9424))

- fix: handle srcset attributes with newline after comma ([#9388](https://github.com/sveltejs/kit/pull/9388))

- fix: allow tsconfig to extend multiple other tsconfigs ([#9413](https://github.com/sveltejs/kit/pull/9413))

- chore: update Undici to 5.21.0 ([#9417](https://github.com/sveltejs/kit/pull/9417))

## 1.11.0

### Minor Changes

- feat: pause on debugger when falling back to full page reload during development ([#9305](https://github.com/sveltejs/kit/pull/9305))

- feat: expose `base` via `$service-worker`, make paths relative ([#9250](https://github.com/sveltejs/kit/pull/9250))

### Patch Changes

- fix: don't automatically prerender non-SSR'd pages ([#9352](https://github.com/sveltejs/kit/pull/9352))

- fix: use 308 responses for trailing slash redirects, instead of 301s ([#9351](https://github.com/sveltejs/kit/pull/9351))

- fix: remove buggy cookie path detection ([#9298](https://github.com/sveltejs/kit/pull/9298))

- fix: don't prevent `beforeNavigate` callbacks from running following a cancelled unloading navigation ([#9347](https://github.com/sveltejs/kit/pull/9347))

- fix: persist DOM state on beforeunload ([#9345](https://github.com/sveltejs/kit/pull/9345))

- fix: redirect to path with/without trailing slash when previewing prerendered pages ([#9353](https://github.com/sveltejs/kit/pull/9353))

- fix: avoid FOUC when using CSS modules in dev ([#9323](https://github.com/sveltejs/kit/pull/9323))

- fix: don't skip required parameters after missing optional parameters ([#9331](https://github.com/sveltejs/kit/pull/9331))

- fix: account for server-emitted assets when prerenering ([#9349](https://github.com/sveltejs/kit/pull/9349))

- fix: deal with fast consecutive promise resolutions when streaming ([#9332](https://github.com/sveltejs/kit/pull/9332))

- chore: replace deprecated property access in preparation for TS 5.0 ([#9361](https://github.com/sveltejs/kit/pull/9361))

## 1.10.1

### Patch Changes

- fix: respect `<base>` when crawling ([#9257](https://github.com/sveltejs/kit/pull/9257))

- fix: scroll before resetting focus, to avoid flash of unscrolled content ([#9311](https://github.com/sveltejs/kit/pull/9311))

- fix: omit hash from global during development ([#9310](https://github.com/sveltejs/kit/pull/9310))

## 1.10.0

### Minor Changes

- feat: add `cookies.getAll` ([#9287](https://github.com/sveltejs/kit/pull/9287))

### Patch Changes

- fix: always include `<link rel="stylesheet">`, even for stylesheets excluded from Link headers ([#9255](https://github.com/sveltejs/kit/pull/9255))

- fix: preserve form state when submitting a second time ([#9267](https://github.com/sveltejs/kit/pull/9267))

## 1.9.3

### Patch Changes

- fix: successive optional route parameters can now be empty ([#9266](https://github.com/sveltejs/kit/pull/9266))

## 1.9.2

### Patch Changes

- fix: correct undefined reference to global var with Vitest ([#9252](https://github.com/sveltejs/kit/pull/9252))

## 1.9.1

### Patch Changes

- feat: warn when calling depends(...) with special URI scheme ([#9246](https://github.com/sveltejs/kit/pull/9246))

## 1.9.0

### Minor Changes

- feat: add `paths.relative` option to control interpretation of `paths.assets` and `paths.base` ([#9220](https://github.com/sveltejs/kit/pull/9220))

## 1.8.8

### Patch Changes

- fix: always add `@sveltejs/kit` to `noExternal` for ssr build ([#9242](https://github.com/sveltejs/kit/pull/9242))
- feat: add `api.methods` and `page.methods` to `builder.routes` ([#9145](https://github.com/sveltejs/kit/pull/9145))

## 1.8.7

### Patch Changes

- fix: correct not found message when setting `paths.base` ([#9232](https://github.com/sveltejs/kit/pull/9232))

## 1.8.6

### Patch Changes

- fix: bundle SvelteKit when using Vitest ([#9172](https://github.com/sveltejs/kit/pull/9172))

## 1.8.5

### Patch Changes

- fix: allow relative fetch to endpoint outside app from within `handle` ([#9198](https://github.com/sveltejs/kit/pull/9198))

## 1.8.4

### Patch Changes

- fix: include .mjs files in precompression ([#9179](https://github.com/sveltejs/kit/pull/9179))

- fix: revert mjs extension usage by default, make it an option ([#9179](https://github.com/sveltejs/kit/pull/9179))

- chore: dummy changeset to force a release ([#9207](https://github.com/sveltejs/kit/pull/9207))

## 1.8.3

### Patch Changes

- fix: use a proprietary content-type to ensure response is not buffered ([#9142](https://github.com/sveltejs/kit/pull/9142))

## 1.8.2

### Patch Changes

- fix: append newline to trigger script evaluation ([#9139](https://github.com/sveltejs/kit/pull/9139))

## 1.8.1

### Patch Changes

- fix: encode streamed chunks ([#9136](https://github.com/sveltejs/kit/pull/9136))

## 1.8.0

### Minor Changes

- feat: implement streaming promises for server load functions ([#8901](https://github.com/sveltejs/kit/pull/8901))

### Patch Changes

- fix: set public env before starting app ([#8957](https://github.com/sveltejs/kit/pull/8957))

- fix: preload modules on Safari ([#8957](https://github.com/sveltejs/kit/pull/8957))

- fix: make `assets` work in client when app is served from a subfolder ([#8957](https://github.com/sveltejs/kit/pull/8957))

## 1.7.2

### Patch Changes

- fix: return correct asset list from `builder.writeClient()` ([#9095](https://github.com/sveltejs/kit/pull/9095))

## 1.7.1

### Patch Changes

- fix: deploy server assets. Only works with Vite 4.1+ ([#9073](https://github.com/sveltejs/kit/pull/9073))

## 1.7.0

### Minor Changes

- feat: richer error message for invalid exports ([#9055](https://github.com/sveltejs/kit/pull/9055))

### Patch Changes

- chore: throw more helpful error when encoding uri fails during prerendering ([#9053](https://github.com/sveltejs/kit/pull/9053))

## 1.6.0

### Minor Changes

- feat: add `OPTIONS` server method ([#8731](https://github.com/sveltejs/kit/pull/8731))

### Patch Changes

- fix: solve `missing "./paths" specifier in "@sveltejs/kit" package` error occurring in all projects ([#9050](https://github.com/sveltejs/kit/pull/9050))

## 1.5.7

### Patch Changes

- fix: use internal alias that won't collide with user aliases ([#9022](https://github.com/sveltejs/kit/pull/9022))

## 1.5.6

### Patch Changes

- fix: ssr defaults preventing minification for client build ([#9012](https://github.com/sveltejs/kit/pull/9012))

- fix: client-side trailing slash redirect when preloading data ([#8982](https://github.com/sveltejs/kit/pull/8982))

## 1.5.5

### Patch Changes

- fix: warn after failed data preloads in dev ([#8985](https://github.com/sveltejs/kit/pull/8985))

## 1.5.4

### Patch Changes

- fix: support all relevant vite cli flags ([#8977](https://github.com/sveltejs/kit/pull/8977))

## 1.5.3

### Patch Changes

- docs: clarify that `version.name` should be deterministic ([#8956](https://github.com/sveltejs/kit/pull/8956))

- fix: correctly include exported http methods in allow header ([#8968](https://github.com/sveltejs/kit/pull/8968))

- chore: polyfill File from node:buffer ([#8925](https://github.com/sveltejs/kit/pull/8925))

- fix: provide helpful error/warning when calling `fetch` during render ([#8551](https://github.com/sveltejs/kit/pull/8551))

- fix: print useful error when subscribing to SvelteKit's stores at the wrong time during SSR ([#8960](https://github.com/sveltejs/kit/pull/8960))

- fix: ignore external links when automatically preloading ([#8961](https://github.com/sveltejs/kit/pull/8961))

- chore: refactor fallback generation ([#8972](https://github.com/sveltejs/kit/pull/8972))

## 1.5.2

### Patch Changes

- fix: always default `paths.assets` to `paths.base` ([#8928](https://github.com/sveltejs/kit/pull/8928))

## 1.5.1

### Patch Changes

- fix: pick up config from endpoints ([#8933](https://github.com/sveltejs/kit/pull/8933))

- fix: don't reuse previous server load cache when there's no server load function ([#8893](https://github.com/sveltejs/kit/pull/8893))

- fix: deduplicate paths in tsconfig ([#8880](https://github.com/sveltejs/kit/pull/8880))

- docs: clarify version management feature ([#8941](https://github.com/sveltejs/kit/pull/8941))

## 1.5.0

### Minor Changes

- feat: support route-level configuration ([#8740](https://github.com/sveltejs/kit/pull/8740))

- feat: add snapshot mechanism for preserving ephemeral DOM state ([#8710](https://github.com/sveltejs/kit/pull/8710))

### Patch Changes

- chore(deps): update dependency undici to v5.18.0 ([#8884](https://github.com/sveltejs/kit/pull/8884))

## 1.4.0

### Minor Changes

- feat: allow $app/paths to be used without an app ([#8838](https://github.com/sveltejs/kit/pull/8838))

### Patch Changes

- fix: ensure types of all form actions are accessible even if differing ([#8877](https://github.com/sveltejs/kit/pull/8877))

- fix: correctly handle HttpErrors on the client side ([#8829](https://github.com/sveltejs/kit/pull/8829))

- docs: discourage use of `goto` with external URLs ([#8837](https://github.com/sveltejs/kit/pull/8837))

- fix: prevent crawling empty urls (`<img src="">`) ([#8883](https://github.com/sveltejs/kit/pull/8883))

- fix: correctly serialize request url when using load `fetch` ([#8876](https://github.com/sveltejs/kit/pull/8876))

- fix: ensure endpoints can fetch endpoints on the same host but not part of the application ([#8869](https://github.com/sveltejs/kit/pull/8869))

## 1.3.10

### Patch Changes

- fix: preserve build error messages ([#8846](https://github.com/sveltejs/kit/pull/8846))

## 1.3.9

### Patch Changes

- fix: output errors properly if pages fail to compile ([#8813](https://github.com/sveltejs/kit/pull/8813))

## 1.3.8

### Patch Changes

- fix: remove Vite manifest before running adapter ([#8815](https://github.com/sveltejs/kit/pull/8815))

## 1.3.7

### Patch Changes

- fix: only show prerendering message when actually prerendering ([#8809](https://github.com/sveltejs/kit/pull/8809))

- fix: handle anchors with special chars when navigating ([#8806](https://github.com/sveltejs/kit/pull/8806))

- fix: await finalise hook and run it only once ([#8817](https://github.com/sveltejs/kit/pull/8817))

## 1.3.6

### Patch Changes

- fix: allow rest parameters to follow multiple optional - or not - parameters ([#8761](https://github.com/sveltejs/kit/pull/8761))

- fix: consider headers when constructing request hash ([#8754](https://github.com/sveltejs/kit/pull/8754))

## 1.3.5

### Patch Changes

- docs: fix typo ([#8790](https://github.com/sveltejs/kit/pull/8790))

- fix: build error on layout with missing leaves ([#8792](https://github.com/sveltejs/kit/pull/8792))

- fix: handle hash links with non-ASCII characters when navigating ([#8767](https://github.com/sveltejs/kit/pull/8767))

## 1.3.4

### Patch Changes

- chore: bump devalue ([#8789](https://github.com/sveltejs/kit/pull/8789))

## 1.3.3

### Patch Changes

- fix: forward `process.env` to child process ([#8777](https://github.com/sveltejs/kit/pull/8777))

## 1.3.2

### Patch Changes

- fix: take base path into account when preloading code ([#8748](https://github.com/sveltejs/kit/pull/8748))

## 1.3.1

### Patch Changes

- fix: only fetch `__data.json` files for routes with a server `load` function ([#8636](https://github.com/sveltejs/kit/pull/8636))

- fix: add `ignoreDeprecations` flag for TS 5.x ([#8718](https://github.com/sveltejs/kit/pull/8718))

- fix: install polyfills when analysing code ([#8636](https://github.com/sveltejs/kit/pull/8636))

## 1.3.0

### Minor Changes

- feat: allow generated tsconfig to be modified ([#8606](https://github.com/sveltejs/kit/pull/8606))

### Patch Changes

- fix: skip navigation hooks on popstate events when only hash changed ([#8730](https://github.com/sveltejs/kit/pull/8730))

## 1.2.10

### Patch Changes

- chore: restrict methods allowed for POST ([#8721](https://github.com/sveltejs/kit/pull/8721))

- fix: provide proper error when POSTing to a missing page endpoint ([#8714](https://github.com/sveltejs/kit/pull/8714))

## 1.2.9

### Patch Changes

- fix: reapply exports alignment after Vite dependency optimizations ([#8690](https://github.com/sveltejs/kit/pull/8690))

## 1.2.8

### Patch Changes

- fix: include base path in path to start script ([#8651](https://github.com/sveltejs/kit/pull/8651))

## 1.2.7

### Patch Changes

- fix: set headers when throwing redirect in handle ([#8648](https://github.com/sveltejs/kit/pull/8648))

## 1.2.6

### Patch Changes

- fix: allow importing assets while using base path ([#8683](https://github.com/sveltejs/kit/pull/8683))

## 1.2.5

### Patch Changes

- fix: check for wrong return values from form actions ([#8553](https://github.com/sveltejs/kit/pull/8553))

## 1.2.4

### Patch Changes

- chore: update undici to v5.16.0 ([#8668](https://github.com/sveltejs/kit/pull/8668))

## 1.2.3

### Patch Changes

- fix: set environment variables before postbuild analysis ([#8647](https://github.com/sveltejs/kit/pull/8647))

## 1.2.2

### Patch Changes

- fix: focus management after navigation ([#8466](https://github.com/sveltejs/kit/pull/8466))

## 1.2.1

### Patch Changes

- feat: throw error if cookie exceeds size limit ([#8591](https://github.com/sveltejs/kit/pull/8591))

## 1.2.0

### Minor Changes

- feat: add `text(...)` helper for generating text responses ([#8371](https://github.com/sveltejs/kit/pull/8371))

- feat: enable access to public env within app.html ([#8449](https://github.com/sveltejs/kit/pull/8449))

- fix: add `Content-Length` header to SvelteKit-generated responses ([#8371](https://github.com/sveltejs/kit/pull/8371))

## 1.1.4

### Patch Changes

- fix: squelch unknown prop warning for `+error.svelte` components ([#8593](https://github.com/sveltejs/kit/pull/8593))

## 1.1.3

### Patch Changes

- docs: explain how to add ambient typings ([#8558](https://github.com/sveltejs/kit/pull/8558))

- fix: ignore `target="_blank"` links ([#8563](https://github.com/sveltejs/kit/pull/8563))

## 1.1.2

### Patch Changes

- fix: correct link in types documentation ([#8557](https://github.com/sveltejs/kit/pull/8557))

- fix: correctly detect changed data ([#8377](https://github.com/sveltejs/kit/pull/8377))

- fix: only generate type definitions with `sync` command ([#8552](https://github.com/sveltejs/kit/pull/8552))

- fix: remove baseUrl to prevent wrong TypeScript auto imports if possible ([#8568](https://github.com/sveltejs/kit/pull/8568))

## 1.1.1

### Patch Changes

- chore: upgrade devalue ([#8520](https://github.com/sveltejs/kit/pull/8520))

## 1.1.0

### Minor Changes

- feat: warn when usage of page options in `.svelte` files or missing `<slot />` in layout is detected ([#8475](https://github.com/sveltejs/kit/pull/8475))

### Patch Changes

- fix: exit postbuild step with code 0 ([#8514](https://github.com/sveltejs/kit/pull/8514))

- fix: only run missing page check in dev mode ([#8515](https://github.com/sveltejs/kit/pull/8515))

- fix: avoid input name clobbering form method check ([#8471](https://github.com/sveltejs/kit/pull/8471))

- fix: exclude service worker from tsconfig ([#8508](https://github.com/sveltejs/kit/pull/8508))

- fix: provide better error message in case of missing `+page.svelte` ([#8478](https://github.com/sveltejs/kit/pull/8478))

## 1.0.13

### Patch Changes

- chore: separate generated from non-generated server code ([#8429](https://github.com/sveltejs/kit/pull/8429))

## 1.0.12

### Patch Changes

- fix: make prerendered endpoint callable from non-prerendered server load ([#8453](https://github.com/sveltejs/kit/pull/8453))

- docs: add links to http status codes ([#8480](https://github.com/sveltejs/kit/pull/8480))

- fix: prerender page when prerender set to 'auto' and ssr set to true ([#8481](https://github.com/sveltejs/kit/pull/8481))

- fix: prevent false positive warnings for fetch uses in firefox ([#8456](https://github.com/sveltejs/kit/pull/8456))

- fix: check version on node fetch fail ([#8487](https://github.com/sveltejs/kit/pull/8487))

- fix: avoid unnecessary $page store updates ([#8457](https://github.com/sveltejs/kit/pull/8457))

## 1.0.11

### Patch Changes

- feat: warn that hydration may break if comments are removed from HTML ([#8423](https://github.com/sveltejs/kit/pull/8423))
- fix: ignore `<a>` elements with no `href` attribute when refocusing after navigation ([#8418](https://github.com/sveltejs/kit/pull/8418))
- fix: invalidate dependencies implicitly added by `fetch` in server load functions ([#8420](https://github.com/sveltejs/kit/pull/8420))

## 1.0.10

### Patch Changes

- fix: skip inline cache when vary header is present ([#8406](https://github.com/sveltejs/kit/pull/8406))

## 1.0.9

### Patch Changes

- fix: add `assetFileNames` to worker rollup options ([#8384](https://github.com/sveltejs/kit/pull/8384))

## 1.0.8

### Patch Changes

- feat: error in dev mode if global `fetch` is used with relative URL ([#8370](https://github.com/sveltejs/kit/pull/8370))
- fix: disable illegal import detection when running unit tests ([#8365](https://github.com/sveltejs/kit/pull/8365))
- fix: only prerender a given dependency once ([#8376](https://github.com/sveltejs/kit/pull/8376))
- fix: `updated.check()` type changed to `Promise<boolean>` ([#8400](https://github.com/sveltejs/kit/pull/8400))
- fix: don't strip body in no-cors mode on the server ([#8412](https://github.com/sveltejs/kit/pull/8412))
- fix: quote 'script' in CSP directives ([#8372](https://github.com/sveltejs/kit/pull/8372))
- fix: correctly compare route ids for load change detection ([#8399](https://github.com/sveltejs/kit/pull/8399))
- fix: don't add nonce attribute to `<link>` elements ([#8369](https://github.com/sveltejs/kit/pull/8369))

## 1.0.7

### Patch Changes

- fix: ignore `*.test.js` and `*.spec.js` files in `params` directory ([#8250](https://github.com/sveltejs/kit/pull/8250))

## 1.0.6

### Patch Changes

- fix: guarantee that `$page.route` has the correct shape ([#8359](https://github.com/sveltejs/kit/pull/8359))

## 1.0.5

### Patch Changes

- fix: update typings of `event.platform` to be possibly undefined ([#8232](https://github.com/sveltejs/kit/pull/8232))

## 1.0.4

### Patch Changes

- fix: don't polyfill undici if using Deno or Bun ([#8338](https://github.com/sveltejs/kit/pull/8338))

## 1.0.3

### Patch Changes

- feat: include submitter's value when progressively enhancing `<form method="get">` ([#8273](https://github.com/sveltejs/kit/pull/8273))

## 1.0.2

### Patch Changes

- fix: correct `filterSerializedResponseHeaders` error message ([#8348](https://github.com/sveltejs/kit/pull/8348))
- fix: correct form action redirect status code ([#8210](https://github.com/sveltejs/kit/pull/8210))

## 1.0.1

### Patch Changes

- fix: explicitly mark Node 17.x as not supported ([#8174](https://github.com/sveltejs/kit/pull/8174))

## 1.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 1.0.0-next.589

### Patch Changes

- breaking: remove warnings/errors about removed/changed APIs ([#8019](https://github.com/sveltejs/kit/pull/8019))

## 1.0.0-next.588

### Patch Changes

- fix: remove obsolete generated types correctly ([#8149](https://github.com/sveltejs/kit/pull/8149))

## 1.0.0-next.587

### Patch Changes

- breaking: prerender shells when ssr false and prerender not false ([#8131](https://github.com/sveltejs/kit/pull/8131))

## 1.0.0-next.586

### Patch Changes

- fix: don't de/encode initial and explicit string headers ([#8113](https://github.com/sveltejs/kit/pull/8113))

## 1.0.0-next.585

### Patch Changes

- fix: remove unused elements from default error component ([#8110](https://github.com/sveltejs/kit/pull/8110))

## 1.0.0-next.584

### Patch Changes

- fix: load errorTemplate from correct location ([#8096](https://github.com/sveltejs/kit/pull/8096))
- More robust manifest error recovery ([#8095](https://github.com/sveltejs/kit/pull/8095))

## 1.0.0-next.583

### Patch Changes

- restart vite dev-server on svelte config change ([#8087](https://github.com/sveltejs/kit/pull/8087))
- Set correct `$page.status` when using `enhance` and result is of type `'error'` ([#8073](https://github.com/sveltejs/kit/pull/8073))
- fix: ensure export conditions are resolve through Vite ([#8092](https://github.com/sveltejs/kit/pull/8092))
- fix: don't crash Vite dev server on manifest error ([#8093](https://github.com/sveltejs/kit/pull/8093))

## 1.0.0-next.582

### Patch Changes

- fix: improve split between Vite plugins ([#8055](https://github.com/sveltejs/kit/pull/8055))
- fix: set Vite base URL ([#8046](https://github.com/sveltejs/kit/pull/8046))
- add declaration for vitePreprocess reexport ([#8053](https://github.com/sveltejs/kit/pull/8053))

## 1.0.0-next.581

### Patch Changes

- feat: vitePreprocess ([#8036](https://github.com/sveltejs/kit/pull/8036))

## 1.0.0-next.580

### Patch Changes

- breaking: throw an error on invalid load response ([#8003](https://github.com/sveltejs/kit/pull/8003))
- fix: allow SvelteKit to be used without bundling ([#7950](https://github.com/sveltejs/kit/pull/7950))

## 1.0.0-next.579

### Patch Changes

- breaking: update svelte peerDependency to ^3.54.0 ([#7543](https://github.com/sveltejs/kit/pull/7543))
- update esbuild to ^0.16.3 ([#7543](https://github.com/sveltejs/kit/pull/7543))
- breaking: upgrade to Vite 4 ([#7543](https://github.com/sveltejs/kit/pull/7543))

## 1.0.0-next.578

### Patch Changes

- fix: respect fetch cache option ([#8024](https://github.com/sveltejs/kit/pull/8024))
- breaking: rename invalid() to fail() and ValidationError to ActionFailure ([#8012](https://github.com/sveltejs/kit/pull/8012))
- breaking: replace automatic fallback generation with `builder.generateFallback(fallback)` ([#8013](https://github.com/sveltejs/kit/pull/8013))

## 1.0.0-next.577

### Patch Changes

- breaking: add embedded option, turned off by default ([#7969](https://github.com/sveltejs/kit/pull/7969))

## 1.0.0-next.576

### Patch Changes

- breaking: make `sveltekit()` return a promise of array of Vite plugins ([#7994](https://github.com/sveltejs/kit/pull/7994))

## 1.0.0-next.575

### Patch Changes

- fix: throw error when using enhance on GET forms ([#7948](https://github.com/sveltejs/kit/pull/7948))
- breaking: strip `__data.json` from url ([#7979](https://github.com/sveltejs/kit/pull/7979))

## 1.0.0-next.574

### Patch Changes

- feat: split Vite plugin in two ([#7990](https://github.com/sveltejs/kit/pull/7990))

## 1.0.0-next.573

### Patch Changes

- fix: adjust ActionData type ([#7962](https://github.com/sveltejs/kit/pull/7962))
- breaking: disallow unknown exports (except when starting with an underscore) from `+(layout|page)(.server)?.js` and `+server.js` files ([#7878](https://github.com/sveltejs/kit/pull/7878))
- fix: continuous optionals should not throw conflict error ([#7939](https://github.com/sveltejs/kit/pull/7939))
- fix `enhance` error message when form action doesn't exist or csrf is enabled ([#7958](https://github.com/sveltejs/kit/pull/7958))

## 1.0.0-next.572

### Minor Changes

- Checks that element is not null before reading getAttribute ([#7930](https://github.com/sveltejs/kit/pull/7930))

### Patch Changes

- chore: update `magic-string` ([#7931](https://github.com/sveltejs/kit/pull/7931))
- add $app and $env to optimizeDeps.exclude so that libraries using these work correctly when prebundled ([#7933](https://github.com/sveltejs/kit/pull/7933))
- reload dev page on change of app.html ([#7944](https://github.com/sveltejs/kit/pull/7944))

## 1.0.0-next.571

### Patch Changes

- fix: use searchParams for x-sveltekit-invalidated ([#7912](https://github.com/sveltejs/kit/pull/7912))
- fix: correct Vite config merging with force option ([#7911](https://github.com/sveltejs/kit/pull/7911))
- fix: rebuild manifest when client hooks or param matcher file is added/removed ([#7915](https://github.com/sveltejs/kit/pull/7915))

## 1.0.0-next.570

### Patch Changes

- Remove prepublishOnly script ([#7893](https://github.com/sveltejs/kit/pull/7893))

## 1.0.0-next.569

### Patch Changes

- Ignore elements that are no longer in the document ([#7881](https://github.com/sveltejs/kit/pull/7881))
- breaking: Use client-side routing for `<form method="GET">` ([#7828](https://github.com/sveltejs/kit/pull/7828))

## 1.0.0-next.568

### Patch Changes

- fix: add migration hint for renamed methods ([#7874](https://github.com/sveltejs/kit/pull/7874))

## 1.0.0-next.567

### Patch Changes

- Co-locate synthetic types with other Kit types ([#7864](https://github.com/sveltejs/kit/pull/7864))

## 1.0.0-next.566

### Patch Changes

- Add more type documentation ([#7003](https://github.com/sveltejs/kit/pull/7003))
- breaking: move SubmitFunction into @sveltejs/kit ([#7003](https://github.com/sveltejs/kit/pull/7003))

## 1.0.0-next.565

### Patch Changes

- breaking: Replace `data-sveltekit-prefetch` with `-preload-code` and `-preload-data` ([#7776](https://github.com/sveltejs/kit/pull/7776))
- breaking: Rename `prefetch` to `preloadData` and `prefetchRoutes` to `preloadCode` ([#7776](https://github.com/sveltejs/kit/pull/7776))

## 1.0.0-next.564

### Patch Changes

- chore: upgrade undici ([#7830](https://github.com/sveltejs/kit/pull/7830))
- Make `$page.url` resilient against mutations ([#7827](https://github.com/sveltejs/kit/pull/7827))

## 1.0.0-next.563

### Patch Changes

- feat: allow handleError to return a promise ([#7780](https://github.com/sveltejs/kit/pull/7780))
- breaking: remove `format` option from `generateManifest(...)` ([#7820](https://github.com/sveltejs/kit/pull/7820))

## 1.0.0-next.562

### Patch Changes

- fix: handle redirects in handle hook while processing data request ([#7797](https://github.com/sveltejs/kit/pull/7797))
- Make touchstart listener passive ([#7818](https://github.com/sveltejs/kit/pull/7818))
- breaking: remove `getStaticDirectory()` from builder API ([#7809](https://github.com/sveltejs/kit/pull/7809))
- Make console.warn wrapper named rather than anonymous ([#7811](https://github.com/sveltejs/kit/pull/7811))

## 1.0.0-next.561

### Patch Changes

- Upgrade vite-plugin-svelte to ^1.3.1 ([#7760](https://github.com/sveltejs/kit/pull/7760))

## 1.0.0-next.560

### Patch Changes

- breaking: Rename `prerendering` to `building`, remove `config.kit.prerender.enabled` ([#7762](https://github.com/sveltejs/kit/pull/7762))

## 1.0.0-next.559

### Patch Changes

- Roll over non-matching optional parameters instead of 404ing ([#7753](https://github.com/sveltejs/kit/pull/7753))
- fix: enable Vite's modulePreload.polyfill ([#7770](https://github.com/sveltejs/kit/pull/7770))

## 1.0.0-next.558

### Patch Changes

- breaking: Disallow error status codes outside 400-599 ([#7767](https://github.com/sveltejs/kit/pull/7767))
- breaking: Make client-side router ignore links outside %sveltekit.body% ([#7766](https://github.com/sveltejs/kit/pull/7766))

## 1.0.0-next.557

### Patch Changes

- external fetch calls: ensure serialized cookie values are url-encoded [#7736] ([#7736](https://github.com/sveltejs/kit/pull/7736))

## 1.0.0-next.556

### Patch Changes

- fix: preserve Vite CLI opts ([#7749](https://github.com/sveltejs/kit/pull/7749))

## 1.0.0-next.555

### Patch Changes

- Made `config.kit.outDir` able to be located in `node_modules` ([#7707](https://github.com/sveltejs/kit/pull/7707))

## 1.0.0-next.554

### Patch Changes

- create stronger types for dynamically generated env modules ([#7735](https://github.com/sveltejs/kit/pull/7735))
- breaking: Make `trailingSlash` a page option, rather than configuration ([#7719](https://github.com/sveltejs/kit/pull/7719))
- Handle hash links with non-ASCII characters when prerendering ([#7729](https://github.com/sveltejs/kit/pull/7729))
- Ignore popstate events from outside the router ([#7721](https://github.com/sveltejs/kit/pull/7721))

## 1.0.0-next.553

### Patch Changes

- Prevent Vite from nuking logs on startup ([#7724](https://github.com/sveltejs/kit/pull/7724))

## 1.0.0-next.552

### Patch Changes

- Don't hardcode version in client bundle ([#7694](https://github.com/sveltejs/kit/pull/7694))
- Allow .d.ts files to have a + prefix ([#7682](https://github.com/sveltejs/kit/pull/7682))
- Expose version from `$app/environment` ([#7689](https://github.com/sveltejs/kit/pull/7689))
- fix: export HttpError/Redirect interface ([#7701](https://github.com/sveltejs/kit/pull/7701))
- fix: don't preload fonts by default ([#7704](https://github.com/sveltejs/kit/pull/7704))
- Always set `Accept` and `Accept-Language` headers when making a self-request ([#7722](https://github.com/sveltejs/kit/pull/7722))
- fix: adjust interfaces to fix type errors ([#7718](https://github.com/sveltejs/kit/pull/7718))

## 1.0.0-next.551

### Patch Changes

- Add `Access-Control-Allow-Origin: *` to static assets in dev ([#7688](https://github.com/sveltejs/kit/pull/7688))
- Ignore presence of `keepfocus` and `noscroll` in `goto` options if correctly-cased options are also present ([#7678](https://github.com/sveltejs/kit/pull/7678))

## 1.0.0-next.550

### Patch Changes

- feat: preload fonts and add preload customization ([#4963](https://github.com/sveltejs/kit/pull/4963))

## 1.0.0-next.549

### Patch Changes

- Always apply Node polyfills ([#7675](https://github.com/sveltejs/kit/pull/7675))

## 1.0.0-next.548

### Patch Changes

- Only apply polyfills where necessary ([#7668](https://github.com/sveltejs/kit/pull/7668))

## 1.0.0-next.547

### Patch Changes

- fix: safely join url segments in manifest ([#7653](https://github.com/sveltejs/kit/pull/7653))
- breaking: use devalue to (de)serialize action data ([#7494](https://github.com/sveltejs/kit/pull/7494))
- Warn if `%sveltekit.body%` is direct child of `<body>` ([#7652](https://github.com/sveltejs/kit/pull/7652))

## 1.0.0-next.546

### Patch Changes

- fix outdated config error ([#7649](https://github.com/sveltejs/kit/pull/7649))
- breaking: use hex/unicode escape sequences for encoding special characters in route directory names ([#7644](https://github.com/sveltejs/kit/pull/7644))
- fix `beforeNavigate` description — `routeId` -> `route.id` ([#7643](https://github.com/sveltejs/kit/pull/7643))

## 1.0.0-next.545

### Patch Changes

- fix: prerendering path and layout fixes ([#7639](https://github.com/sveltejs/kit/pull/7639))
- fix: add Promise return type to the `enhance` action ([#7629](https://github.com/sveltejs/kit/pull/7629))

## 1.0.0-next.544

### Patch Changes

- breaking: narrow down possible status codes for redirects to 300-308 ([#7615](https://github.com/sveltejs/kit/pull/7615))
- feat: add fallback component for layouts without one ([#7619](https://github.com/sveltejs/kit/pull/7619))

## 1.0.0-next.543

### Patch Changes

- Don't print search params error when prerendering fallback page ([#7598](https://github.com/sveltejs/kit/pull/7598))
- allow async function for `enhance` action parameter ([#7608](https://github.com/sveltejs/kit/pull/7608))
- Run service worker during development ([#7597](https://github.com/sveltejs/kit/pull/7597))
- feat: support throwing redirect in handle ([#7612](https://github.com/sveltejs/kit/pull/7612))
- Workaround for the DOM clobbering for use:enhance ([#7599](https://github.com/sveltejs/kit/pull/7599))
- fix: don't cache prefetch errors ([#7610](https://github.com/sveltejs/kit/pull/7610))

## 1.0.0-next.542

### Patch Changes

- Add support for linking to <a name="hash"> tags ([#7596](https://github.com/sveltejs/kit/pull/7596))
- breaking: don't run beforeNavigate during redirects ([#7588](https://github.com/sveltejs/kit/pull/7588))
- fix: respect autofocus following navigation or enhanced form submit ([#6643](https://github.com/sveltejs/kit/pull/6643))

## 1.0.0-next.541

### Minor Changes

- fix: don't clean build and output directories when using `--watch` ([#7516](https://github.com/sveltejs/kit/pull/7516))

### Patch Changes

- fix: handle expected errors thrown in handle hook correctly ([#7566](https://github.com/sveltejs/kit/pull/7566))

## 1.0.0-next.540

### Patch Changes

- Serve prerendered non-page files when running preview ([#7576](https://github.com/sveltejs/kit/pull/7576))
- fix: caching takes now into account the body payload ([#7546](https://github.com/sveltejs/kit/pull/7546))
- fix: handle locked readable stream when reading body ([#7565](https://github.com/sveltejs/kit/pull/7565))
- fix: prefetch should ignore links ignored by the router ([#7580](https://github.com/sveltejs/kit/pull/7580))
- fix: migration error when using $page.routeId ([#7574](https://github.com/sveltejs/kit/pull/7574))
- prevent loading of illegal modules in the browser, rather than during SSR ([#7507](https://github.com/sveltejs/kit/pull/7507))
- fix: prevent double decoding of path segment ([#7550](https://github.com/sveltejs/kit/pull/7550))

## 1.0.0-next.539

### Patch Changes

- Omit prerendered routes from server manifest ([#7541](https://github.com/sveltejs/kit/pull/7541))

## 1.0.0-next.538

### Patch Changes

- feat: enable caching for `__data.json` requests ([#7532](https://github.com/sveltejs/kit/pull/7532))
- fix: prevent double decoding of params ([#7521](https://github.com/sveltejs/kit/pull/7521))
- fix: take into account Request input when serializing fetch data ([#7531](https://github.com/sveltejs/kit/pull/7531))
- fix: better cookie warning checks ([#7528](https://github.com/sveltejs/kit/pull/7528))

## 1.0.0-next.537

### Patch Changes

- feat: better navigation interfaces ([#7529](https://github.com/sveltejs/kit/pull/7529))

## 1.0.0-next.536

### Patch Changes

- custom aliases resolved in service worker builds ([#7500](https://github.com/sveltejs/kit/pull/7500))

## 1.0.0-next.535

### Patch Changes

- breaking: call beforeNavigate once with type unload on external navigation, rename type 'load' to 'enter' and type 'unload' to 'leave', add 'willUnload' property ([#6813](https://github.com/sveltejs/kit/pull/6813))

## 1.0.0-next.534

### Patch Changes

- breaking: more consistent casing for goto options ([#7502](https://github.com/sveltejs/kit/pull/7502))
- breaking: replace routeId with route.id ([#7450](https://github.com/sveltejs/kit/pull/7450))
- Fix nullish data node reference ([#7503](https://github.com/sveltejs/kit/pull/7503))

## 1.0.0-next.533

### Patch Changes

- fix: bump required Vite version and address warning ([#7491](https://github.com/sveltejs/kit/pull/7491))

## 1.0.0-next.532

### Patch Changes

- Bump devalue version ([#7466](https://github.com/sveltejs/kit/pull/7466))

## 1.0.0-next.531

### Patch Changes

- breaking: change `config.kit.prerender.onError` to `handleHttpError`, and check for invalid fragment links ([#7375](https://github.com/sveltejs/kit/pull/7375))
- fix escaping bug in crawler ([#7375](https://github.com/sveltejs/kit/pull/7375))

## 1.0.0-next.530

### Patch Changes

- fix: fetch erroring on Cloudflare ([#7453](https://github.com/sveltejs/kit/pull/7453))
- Only simulate CORS errors for shared load functions ([#7454](https://github.com/sveltejs/kit/pull/7454))

## 1.0.0-next.529

### Patch Changes

- fix: better type generation for load functions with different return values ([#7425](https://github.com/sveltejs/kit/pull/7425))
- fix: correctly strip data suffix at root page ([#7445](https://github.com/sveltejs/kit/pull/7445))
- update dependencies ([#7355](https://github.com/sveltejs/kit/pull/7355))

## 1.0.0-next.528

### Patch Changes

- Restore `req.url` to `req.originalUrl` in dev and preview ([#7343](https://github.com/sveltejs/kit/pull/7343))

## 1.0.0-next.527

### Patch Changes

- fix: harmonize cookie path and add dev time warnings ([#7416](https://github.com/sveltejs/kit/pull/7416))
- feat: add invalidateAll option to goto ([#7407](https://github.com/sveltejs/kit/pull/7407))

## 1.0.0-next.526

### Patch Changes

- declare function type with named syntax ([#7396](https://github.com/sveltejs/kit/pull/7396))
- fix: optional params can be undefined ([#7379](https://github.com/sveltejs/kit/pull/7379))
- fix: support undici 5.12.0 and pin it ([#7412](https://github.com/sveltejs/kit/pull/7412))
- chore: upgrade to vite-plugin-svelte 1.1.0 and enable prebundleSvelteLibraries ([#7388](https://github.com/sveltejs/kit/pull/7388))
- Show more descriptive error if data returned from `load` is a non-POJO ([#7386](https://github.com/sveltejs/kit/pull/7386))

## 1.0.0-next.525

### Patch Changes

- Always avoid caching form submission on enhanced forms ([#7350](https://github.com/sveltejs/kit/pull/7350))

## 1.0.0-next.524

### Patch Changes

- fix: get type gen working again ([#7370](https://github.com/sveltejs/kit/pull/7370))
- fix: don't run matchers for empty optional params ([#7346](https://github.com/sveltejs/kit/pull/7346))

## 1.0.0-next.523

### Patch Changes

- fix: split route ids into correct segments ([#7367](https://github.com/sveltejs/kit/pull/7367))

## 1.0.0-next.522

### Patch Changes

- docs: rewrite load docs ([#7174](https://github.com/sveltejs/kit/pull/7174))
- breaking: Prefix all route IDs with / ([#7338](https://github.com/sveltejs/kit/pull/7338))

## 1.0.0-next.521

### Patch Changes

- feat: add reset option to update method of enhance ([#7326](https://github.com/sveltejs/kit/pull/7326))
- breaking: remove global fetch override when prerendering ([#7318](https://github.com/sveltejs/kit/pull/7318))
- Improve error message when prefetching fails ([#7314](https://github.com/sveltejs/kit/pull/7314))

## 1.0.0-next.520

### Patch Changes

- fix: ensure serialized headers check is always applied ([#7221](https://github.com/sveltejs/kit/pull/7221))

## 1.0.0-next.519

### Patch Changes

- breaking: throw error when routes conflict ([#7051](https://github.com/sveltejs/kit/pull/7051))
- feat: implement optional route params ([#7051](https://github.com/sveltejs/kit/pull/7051))

## 1.0.0-next.518

### Patch Changes

- Enable removal of non-browser code from client builds ([#7296](https://github.com/sveltejs/kit/pull/7296))
- feat: more info about prerendering errors, add strict option to adapter-static ([#7264](https://github.com/sveltejs/kit/pull/7264))

## 1.0.0-next.517

### Patch Changes

- fix: more informative serialization error messages ([#7303](https://github.com/sveltejs/kit/pull/7303))
- fix: add `$types` to includes for better DX ([#7301](https://github.com/sveltejs/kit/pull/7301))

## 1.0.0-next.516

### Patch Changes

- fix: better navigation protocol check ([#7067](https://github.com/sveltejs/kit/pull/7067))
- fix: forward cookie headers on etag response ([#7256](https://github.com/sveltejs/kit/pull/7256))
- Properly resolve absolute paths to relative on server build ([#7252](https://github.com/sveltejs/kit/pull/7252))

## 1.0.0-next.515

### Patch Changes

- Account for relative path to routes in `config.kit.files.routes` ([#7223](https://github.com/sveltejs/kit/pull/7223))
- Use config.kit.paths.base prefix for static assets ([#4448](https://github.com/sveltejs/kit/pull/4448))

## 1.0.0-next.514

### Patch Changes

- add helpful error message for `throw invalid()` in form actions ([#7225](https://github.com/sveltejs/kit/pull/7225))

## 1.0.0-next.513

### Patch Changes

- Transfer server data as devalue-encoded JSON ([#7177](https://github.com/sveltejs/kit/pull/7177))
- fix: remove groups from segments for adapters ([#7222](https://github.com/sveltejs/kit/pull/7222))

## 1.0.0-next.512

### Patch Changes

- Fix parsing content-type header for actions ([#7195](https://github.com/sveltejs/kit/pull/7195))
- fix: reset form in use:enhance after successful submit ([#7207](https://github.com/sveltejs/kit/pull/7207))
- fix: auto-update commented PageError ([#7189](https://github.com/sveltejs/kit/pull/7189))

## 1.0.0-next.511

### Patch Changes

- perf: render head links before other content ([#7160](https://github.com/sveltejs/kit/pull/7160))

## 1.0.0-next.510

### Patch Changes

- Add `fetch` to `RequestEvent` ([#7113](https://github.com/sveltejs/kit/pull/7113))

## 1.0.0-next.509

### Patch Changes

- Apply define config to service worker ([#7140](https://github.com/sveltejs/kit/pull/7140))
- chore: Skip removing HTTP/2 pseudo-headers, which is no longer necessary with undici ([#7142](https://github.com/sveltejs/kit/pull/7142))
- bump devalue to version 4 ([#7147](https://github.com/sveltejs/kit/pull/7147))

## 1.0.0-next.508

### Patch Changes

- chore: Upgrade undici so that we can use its multipart form data parsing instead of node-fetch's ([#7131](https://github.com/sveltejs/kit/pull/7131))

## 1.0.0-next.507

### Patch Changes

- Allow TypedArray request bodies in `fetch` in `load` ([#7065](https://github.com/sveltejs/kit/pull/7065))
- Use `FormData` polyfill from `undici` rather than `node-fetch` ([#7065](https://github.com/sveltejs/kit/pull/7065))

## 1.0.0-next.506

### Patch Changes

- Default to insecure cookies when serving on http://localhost ([#7090](https://github.com/sveltejs/kit/pull/7090))
- docs: explain ramifications of base path ([#7095](https://github.com/sveltejs/kit/pull/7095))
- fix: decode routeIds in headers for prerendering ([#7097](https://github.com/sveltejs/kit/pull/7097))
- feat: provide `update` to `use:enhance` callback ([#7083](https://github.com/sveltejs/kit/pull/7083))

## 1.0.0-next.505

### Patch Changes

- fix: handle form action returning nothing; handle page.(server).js without load functions ([#7050](https://github.com/sveltejs/kit/pull/7050))
- fix: add `RequestEvent` to `$types` when `+layout.server.js` present ([#7063](https://github.com/sveltejs/kit/pull/7063))

## 1.0.0-next.504

### Patch Changes

- Add the submitter value with name to formData for use:enhance ([#7012](https://github.com/sveltejs/kit/pull/7012))

## 1.0.0-next.503

### Patch Changes

- Added form property to \$page store ([#6986](https://github.com/sveltejs/kit/pull/6986))
- Throw an error if prerenderable routes are not prerendered ([#6974](https://github.com/sveltejs/kit/pull/6974))

## 1.0.0-next.502

### Patch Changes

- fix: prevent data types from becoming type `never`, notice moved/deleted files ([#7002](https://github.com/sveltejs/kit/pull/7002))
- Allow ActionData to be undefined ([#6994](https://github.com/sveltejs/kit/pull/6994))
- Respect `config.kit.env.dir` when running `vite preview` ([#7001](https://github.com/sveltejs/kit/pull/7001))
- Only run postinstall script if package.json exists ([#6998](https://github.com/sveltejs/kit/pull/6998))
- Use custom x-sveltekit-action header to route enhanced form submissions to +page.server.js over +server.js ([#6997](https://github.com/sveltejs/kit/pull/6997))

## 1.0.0-next.501

### Patch Changes

- fix: unwrap promises for load function data on the client ([#6972](https://github.com/sveltejs/kit/pull/6972))

## 1.0.0-next.500

### Patch Changes

- Allow prerendered pages to link to non-prerenderable endpoints ([#6977](https://github.com/sveltejs/kit/pull/6977))
- fix: handle SPA root data loading error ([#6918](https://github.com/sveltejs/kit/pull/6918))

## 1.0.0-next.499

### Patch Changes

- breaking: rename App.PageError to App.Error ([#6963](https://github.com/sveltejs/kit/pull/6963))

## 1.0.0-next.498

### Patch Changes

- chdir before attempting postinstall ([#6969](https://github.com/sveltejs/kit/pull/6969))

## 1.0.0-next.497

### Patch Changes

- Add origin header for non-GET and external requests made with server-side fetch ([#6901](https://github.com/sveltejs/kit/pull/6901))

## 1.0.0-next.496

### Patch Changes

- fix: update page status when applying action ([#6942](https://github.com/sveltejs/kit/pull/6942))
- fix: apply redirect/error logic for `use:enhance` ([#6828](https://github.com/sveltejs/kit/pull/6828))

## 1.0.0-next.495

### Patch Changes

- Run `svelte-kit sync` in all workspace directories during postinstall ([#6949](https://github.com/sveltejs/kit/pull/6949))

## 1.0.0-next.494

### Patch Changes

- Fix fetch type ([#6955](https://github.com/sveltejs/kit/pull/6955))
- Add csp wasm-unsafe-eval keyword ([#6958](https://github.com/sveltejs/kit/pull/6958))
- Register service worker with relative URL ([#6954](https://github.com/sveltejs/kit/pull/6954))

## 1.0.0-next.493

### Patch Changes

- fix: allow missing routes folder ([#6944](https://github.com/sveltejs/kit/pull/6944))
- Only forward set-cookie headers for internal fetches ([#6923](https://github.com/sveltejs/kit/pull/6923))

## 1.0.0-next.492

### Patch Changes

- fix: add missing depends function to ServerLoadEvent type ([#6935](https://github.com/sveltejs/kit/pull/6935))
- Redact error message if `getRequest` fails ([#6936](https://github.com/sveltejs/kit/pull/6936))
- Add cookies.serialize method ([#6925](https://github.com/sveltejs/kit/pull/6925))
- Always apply cookies, not just for matched routes ([#6925](https://github.com/sveltejs/kit/pull/6925))
- fix: tighten up navigation and invalidation logic ([#6924](https://github.com/sveltejs/kit/pull/6924))
- Respond with 413 if request body is too large ([#6936](https://github.com/sveltejs/kit/pull/6936))

## 1.0.0-next.491

### Patch Changes

- fix: symlink routes ([#6796](https://github.com/sveltejs/kit/pull/6796))

## 1.0.0-next.490

### Patch Changes

- fix `write_types` on windows using posixify() ([#6913](https://github.com/sveltejs/kit/pull/6913))
- Prevent caching of `__data.js` files ([#6904](https://github.com/sveltejs/kit/pull/6904))
- Make url property getters non-enumerable ([#6909](https://github.com/sveltejs/kit/pull/6909))

## 1.0.0-next.489

### Patch Changes

- fix: tighten up handling and documentation around 404 ([#6897](https://github.com/sveltejs/kit/pull/6897))

## 1.0.0-next.488

### Patch Changes

- Decode HTML entities in `href` attributes when crawling ([#6891](https://github.com/sveltejs/kit/pull/6891))

## 1.0.0-next.487

### Patch Changes

- feat: allow +server.js files next to +page files ([#6773](https://github.com/sveltejs/kit/pull/6773))

## 1.0.0-next.486

### Patch Changes

- fix: handle jsdoc without tags while generating proxy types ([#6884](https://github.com/sveltejs/kit/pull/6884))

## 1.0.0-next.485

### Patch Changes

- fix to ActionData type generation ([#6869](https://github.com/sveltejs/kit/pull/6869))
- The return type of cookies.get is string|undefined #6865 ([#6867](https://github.com/sveltejs/kit/pull/6867))

## 1.0.0-next.484

### Patch Changes

- fix: forward cookies from fetch on redirect response ([#6833](https://github.com/sveltejs/kit/pull/6833))
- adding missing `@types/cookie` dependency ([#6818](https://github.com/sveltejs/kit/pull/6818))
- fix `write_types` on windows ([#6843](https://github.com/sveltejs/kit/pull/6843))

## 1.0.0-next.483

### Patch Changes

- fix: various `cookies` fixes and improvements ([#6811](https://github.com/sveltejs/kit/pull/6811))

## 1.0.0-next.482

### Patch Changes

- fix: ActionData type ([#6748](https://github.com/sveltejs/kit/pull/6748))
- fix: reuse server data while not reusing client load ([#6778](https://github.com/sveltejs/kit/pull/6778))
- fix: update current.url on hashchange ([#6802](https://github.com/sveltejs/kit/pull/6802))
- Change illegal import message to reference public-facing code rather than client-side code ([#6646](https://github.com/sveltejs/kit/pull/6646))
- fix: silence prop warnings ([#6798](https://github.com/sveltejs/kit/pull/6798))
- chore: Refactor graph analysis for better unit tests ([#6727](https://github.com/sveltejs/kit/pull/6727))
- fix: error when using `paths.base` and `import` assets ([#6769](https://github.com/sveltejs/kit/pull/6769))

## 1.0.0-next.481

### Patch Changes

- fix: docs links in generated and published types ([#6741](https://github.com/sveltejs/kit/pull/6741))

## 1.0.0-next.480

### Patch Changes

- breaking: make action passed to enhance function a URL instead of a string ([#6678](https://github.com/sveltejs/kit/pull/6678))

## 1.0.0-next.479

### Patch Changes

- breaking: request creation cleanup ([#6681](https://github.com/sveltejs/kit/pull/6681))
- breaking: limit adapter-node request size ([#6684](https://github.com/sveltejs/kit/pull/6684))

## 1.0.0-next.478

### Patch Changes

- breaking: hooks file renames; error shape defined through handleError ([#6675](https://github.com/sveltejs/kit/pull/6675))
- breaking: remove element property; enhance can only be used on form elements ([#6662](https://github.com/sveltejs/kit/pull/6662))

## 1.0.0-next.477

### Patch Changes

- breaking: prevent import of `$lib/server` modules in client-facing code ([#6623](https://github.com/sveltejs/kit/pull/6623))
- breaking: change sveltekit.message to sveltekit.error.message ([#6659](https://github.com/sveltejs/kit/pull/6659))
- breaking: apply 304 logic after handle, so handle receives original response from resolve ([#6639](https://github.com/sveltejs/kit/pull/6639))

## 1.0.0-next.476

### Patch Changes

- breaking: change use:enhance signature to support `<button formaction>` ([#6633](https://github.com/sveltejs/kit/pull/6633))

## 1.0.0-next.475

### Patch Changes

- cookies.delete fix #6609 ([#6622](https://github.com/sveltejs/kit/pull/6622))
- feat: provide `SubmitFunction` type ([#6613](https://github.com/sveltejs/kit/pull/6613))
- fix: address Vite warning when using base or asset path ([#6621](https://github.com/sveltejs/kit/pull/6621))

## 1.0.0-next.474

### Patch Changes

- breaking: disallow default and named actions next to each other ([#6615](https://github.com/sveltejs/kit/pull/6615))

## 1.0.0-next.473

### Patch Changes

- fix: pass `form` prop to pages ([#6611](https://github.com/sveltejs/kit/pull/6611))

## 1.0.0-next.472

### Patch Changes

- breaking: add API for interacting with cookies ([#6593](https://github.com/sveltejs/kit/pull/6593))
- breaking: Replace `POST`/`PUT`/`PATCH`/`DELETE` in `+page.server.js` with `export const actions` ([#6469](https://github.com/sveltejs/kit/pull/6469))

## 1.0.0-next.471

### Patch Changes

- breaking: Allow users to designate modules as server-only ([#6422](https://github.com/sveltejs/kit/pull/6422))
- breaking: exclude headers from serialized responses by default, add `filterSerializedResponseHeaders` `resolve` option ([#6569](https://github.com/sveltejs/kit/pull/6569))

## 1.0.0-next.470

### Patch Changes

- Bump vite-plugin-svelte and required vite version ([#6583](https://github.com/sveltejs/kit/pull/6583))
- feat: Support for `$env/dynamic/*` in Vite ecosystem tools ([#6454](https://github.com/sveltejs/kit/pull/6454))
- breaking: Replace `externalFetch` with `handleFetch` ([#6565](https://github.com/sveltejs/kit/pull/6565))

## 1.0.0-next.469

### Patch Changes

- disable `rollupOptions.output.hoistTransitiveImports` by default ([#6560](https://github.com/sveltejs/kit/pull/6560))

## 1.0.0-next.468

### Patch Changes

- breaking: simulate CORS errors in server-side fetch ([#6550](https://github.com/sveltejs/kit/pull/6550))

## 1.0.0-next.467

### Patch Changes

- breaking: prevent server-side fetch from reading files with # character in the filename ([#6549](https://github.com/sveltejs/kit/pull/6549))

## 1.0.0-next.466

### Patch Changes

- breaking: change Navigation type to include from/to.params and from/to.routeId ([#6552](https://github.com/sveltejs/kit/pull/6552))
- Warn about incorrect data-sveltekit-x values ([#6546](https://github.com/sveltejs/kit/pull/6546))

## 1.0.0-next.465

### Patch Changes

- feat: add `type` to navigation object ([#6537](https://github.com/sveltejs/kit/pull/6537))

## 1.0.0-next.464

### Patch Changes

- Fix server manifest generation ([#6507](https://github.com/sveltejs/kit/pull/6507))
- Silently skip prefetching of external URLs when using `data-sveltekit-prefetch`. Warn like before when calling `prefetch()` for external URLs. ([#6518](https://github.com/sveltejs/kit/pull/6518))

## 1.0.0-next.463

### Patch Changes

- fix peer dependency warning on vite-3.1.0-beta.1 ([#6512](https://github.com/sveltejs/kit/pull/6512))
- breaking: respect cache-control max-age on the client for initially fetched responses ([#6461](https://github.com/sveltejs/kit/pull/6461))

## 1.0.0-next.462

### Patch Changes

- breaking: block cross-site form POSTs by default. disable with config.kit.csrf.checkOrigin ([#6510](https://github.com/sveltejs/kit/pull/6510))

## 1.0.0-next.461

### Patch Changes

- breaking: call `invalidate(fn)` predicates with a URL instead of a string ([#6493](https://github.com/sveltejs/kit/pull/6493))
- Prefer JSON responses when returning errors if accept header is `*/*` ([#6497](https://github.com/sveltejs/kit/pull/6497))
- breaking: replace invalidate() with invalidateAll() ([#6493](https://github.com/sveltejs/kit/pull/6493))

## 1.0.0-next.460

### Patch Changes

- breaking: Remove sveltekit:start event ([#6484](https://github.com/sveltejs/kit/pull/6484))

## 1.0.0-next.459

### Patch Changes

- Prevent validation_errors from being serialized twice ([#6468](https://github.com/sveltejs/kit/pull/6468))

## 1.0.0-next.458

### Patch Changes

- breaking: catch and render raw response when unexpected error occurs in endpoint ([#6434](https://github.com/sveltejs/kit/pull/6434))

## 1.0.0-next.457

### Patch Changes

- Print error if resolveOpts.ssr is set ([#6475](https://github.com/sveltejs/kit/pull/6475))

## 1.0.0-next.456

### Patch Changes

- Apply `data-sveltekit-prefetch/noscroll/reload` to all child `<a>` elements ([#6442](https://github.com/sveltejs/kit/pull/6442))
- fix: Saving the root route will write types now ([#6450](https://github.com/sveltejs/kit/pull/6450))

## 1.0.0-next.455

### Patch Changes

- bump vite-plugin-svelte to 1.0.3 to fix an issue with svelte-inspector in vite 3.1 ([#6443](https://github.com/sveltejs/kit/pull/6443))
- chore: bump ts version and ensure it works with latest changes ([#6428](https://github.com/sveltejs/kit/pull/6428))
- breaking: `ssr/hydrate/router/prerender.default` are now configurable in `+page(.server).js` and `+layout(.server).js` ([#6197](https://github.com/sveltejs/kit/pull/6197))
- breaking: add `error.html` page, rename `kit.config.files.template` to `kit.config.files.appTemplate` ([#6367](https://github.com/sveltejs/kit/pull/6367))
- breaking: merge resolve options when using sequence helper ([#6401](https://github.com/sveltejs/kit/pull/6401))
- breaking: replace `router`/`hydrate` page options with `csr` ([#6446](https://github.com/sveltejs/kit/pull/6446))
- breaking: add `prerender = 'auto'` option, and extend `prerender` option to endpoints ([#6392](https://github.com/sveltejs/kit/pull/6392))

## 1.0.0-next.454

### Patch Changes

- breaking: Replace `sveltekit:*` with valid HTML attributes like `data-sveltekit-*` ([#6170](https://github.com/sveltejs/kit/pull/6170))

## 1.0.0-next.453

### Patch Changes

- Include type descriptions for ambient declarations ([#6416](https://github.com/sveltejs/kit/pull/6416))

## 1.0.0-next.452

### Patch Changes

- breaking: remove App.PrivateEnv and App.PublicEnv in favour of generated types ([#6413](https://github.com/sveltejs/kit/pull/6413))

## 1.0.0-next.451

### Patch Changes

- Prevent infinite reloads on `/` when root `+layout.server.js` exports `load` ([#6405](https://github.com/sveltejs/kit/pull/6405))

## 1.0.0-next.450

### Patch Changes

- breaking: require Vite 3.1.0-beta.1 ([#6398](https://github.com/sveltejs/kit/pull/6398))

## 1.0.0-next.449

### Patch Changes

- fix: silence unused type hints in generated proxy files ([#6391](https://github.com/sveltejs/kit/pull/6391))

## 1.0.0-next.448

### Patch Changes

- prevent test suites from getting published ([#6386](https://github.com/sveltejs/kit/pull/6386))
- fix: remove unnecessary JSON serialization of server data ([#6382](https://github.com/sveltejs/kit/pull/6382))
- breaking: require Node 16.14 ([#6388](https://github.com/sveltejs/kit/pull/6388))

## 1.0.0-next.447

### Patch Changes

- Use devalue to serialize server-only `load` return values ([#6318](https://github.com/sveltejs/kit/pull/6318))

## 1.0.0-next.446

### Patch Changes

- fix: encode if root layout has server load ([#6352](https://github.com/sveltejs/kit/pull/6352))

## 1.0.0-next.445

### Patch Changes

- breaking: rename `$app/env` to `$app/environment`, to disambiguate with `$env/...` ([#6334](https://github.com/sveltejs/kit/pull/6334))

## 1.0.0-next.444

### Patch Changes

- set errors on root component ([#6330](https://github.com/sveltejs/kit/pull/6330))
- fix: do not call server and update `$page.data` unnecessarily ([#6311](https://github.com/sveltejs/kit/pull/6311))

## 1.0.0-next.443

### Patch Changes

- fix: prevent unused types warning ([#6293](https://github.com/sveltejs/kit/pull/6293))
- fix: don't reuse server load data from previous page if current doesn't have a load function ([#6309](https://github.com/sveltejs/kit/pull/6309))

## 1.0.0-next.442

### Patch Changes

- fix: handle case where parent() refers to missing load function ([#6282](https://github.com/sveltejs/kit/pull/6282))

## 1.0.0-next.441

### Patch Changes

- fix: Set `errors` prop on all layout/leaf components, not just page that happens to be deepest ([#6279](https://github.com/sveltejs/kit/pull/6279))
- Fix route sorting with groups ([#6288](https://github.com/sveltejs/kit/pull/6288))

## 1.0.0-next.440

### Patch Changes

- fix: type tweaks ([#6271](https://github.com/sveltejs/kit/pull/6271))
- Correctly determine whether route uses server data ([#6275](https://github.com/sveltejs/kit/pull/6275))

## 1.0.0-next.439

### Patch Changes

- feat: add App.PageData type ([#6226](https://github.com/sveltejs/kit/pull/6226))

## 1.0.0-next.438

### Patch Changes

- more granular URL property tracking during load ([#6237](https://github.com/sveltejs/kit/pull/6237))
- breaking: change event.clientAddress to event.getClientAddress() ([#6237](https://github.com/sveltejs/kit/pull/6237))
- Remove all enumerable getters from RequestEvent and LoadEvent ([#6237](https://github.com/sveltejs/kit/pull/6237))

## 1.0.0-next.437

### Patch Changes

- fix: only generate blank non-SSR pages when prerendering is enabled ([#6251](https://github.com/sveltejs/kit/pull/6251))

## 1.0.0-next.436

### Patch Changes

- fix: prerender routes in a (group) ([#6232](https://github.com/sveltejs/kit/pull/6232))

## 1.0.0-next.435

### Patch Changes

- fix: allow `@` route breakouts to layouts in `[foo]` or `(foo)` directories ([#6224](https://github.com/sveltejs/kit/pull/6224))

## 1.0.0-next.434

### Patch Changes

- Always create `$types` for a route with a layout, leaf or endpoint ([#6222](https://github.com/sveltejs/kit/pull/6222))

## 1.0.0-next.433

### Patch Changes

- feat: Moved hooks.js initialization from Server.respond into Server.init ([#6179](https://github.com/sveltejs/kit/pull/6179))

## 1.0.0-next.432

### Patch Changes

- breaking: implement new layout system (see the PR for migration instructions) ([#6174](https://github.com/sveltejs/kit/pull/6174))

## 1.0.0-next.431

### Patch Changes

- feat: Avoid running load on the server unnecessarily ([#6056](https://github.com/sveltejs/kit/pull/6056))

## 1.0.0-next.430

### Patch Changes

- feat: Added config.kit.env.dir, which allows users to set a directory to search for .env files ([#6175](https://github.com/sveltejs/kit/pull/6175))

## 1.0.0-next.429

### Patch Changes

- fix: Prevent import of `$env/*/private` in client ([#6018](https://github.com/sveltejs/kit/pull/6018))
- Fix vite.config.ts "Cannot find module '@sveltejs/kit/vite' or its corresponding type declarations." ([#6140](https://github.com/sveltejs/kit/pull/6140))

## 1.0.0-next.428

### Patch Changes

- Allow `$app/stores` to be used from anywhere on the browser ([#6100](https://github.com/sveltejs/kit/pull/6100))
- use `enumerable: false` on "[x] no longer exists" getters so that they are not triggered by spreading ([#6105](https://github.com/sveltejs/kit/pull/6105))
- Fix pattern matching for routes starting with an encoded `@` symbol ([#6110](https://github.com/sveltejs/kit/pull/6110))
- Fix typos in generating `LayoutServerLoad.{name}` type ([#6123](https://github.com/sveltejs/kit/pull/6123))
- Fix sorting of files into +layout, +error, everything else. ([#6108](https://github.com/sveltejs/kit/pull/6108))
- Add test folder to generated tsconfig ([#6085](https://github.com/sveltejs/kit/pull/6085))

## 1.0.0-next.427

### Patch Changes

- Throw error if browser.hydrate is false and browser.router is true ([#6086](https://github.com/sveltejs/kit/pull/6086))

## 1.0.0-next.426

### Patch Changes

- Avoid using [].at(-1) in the client ([#6082](https://github.com/sveltejs/kit/pull/6082))

## 1.0.0-next.425

### Patch Changes

- Silence more unknown prop warnings coming from SvelteKit ([#6078](https://github.com/sveltejs/kit/pull/6078))

## 1.0.0-next.424

### Patch Changes

- prevent duplicate module ids by disabling optimizeDeps for @sveltejs/kit ([#6057](https://github.com/sveltejs/kit/pull/6057))
- Generate types when Svelte file missing, fix layout params ([#6066](https://github.com/sveltejs/kit/pull/6066))
- Silence unknown prop warnings coming from SvelteKit ([#6071](https://github.com/sveltejs/kit/pull/6071))

## 1.0.0-next.423

### Patch Changes

- Accumulate data from parent layouts into `export let data` ([#6050](https://github.com/sveltejs/kit/pull/6050))

## 1.0.0-next.422

### Patch Changes

- breaking: remove ability for `+page.server.js` to respond to `GET` requests with JSON ([#6007](https://github.com/sveltejs/kit/pull/6007))
- Handle `throw error/redirect` in `+server.js` ([#6028](https://github.com/sveltejs/kit/pull/6028))
- handle `set-cookie` in `setHeaders` ([#6033](https://github.com/sveltejs/kit/pull/6033))
- Handle windows paths and regexp chars in kit.alias ([#6034](https://github.com/sveltejs/kit/pull/6034))
- Make errors type in Action type less restrictive ([#6022](https://github.com/sveltejs/kit/pull/6022))
- Check that data is serializable ([#5987](https://github.com/sveltejs/kit/pull/5987))
- Fix parent data type for layouts referencing named layouts in the same folder ([#6025](https://github.com/sveltejs/kit/pull/6025))

## 1.0.0-next.421

### Patch Changes

- Respect `export const prerender = false` in `+page.server.js` ([#6012](https://github.com/sveltejs/kit/pull/6012))

## 1.0.0-next.420

### Patch Changes

- fix: support linked `@sveltejs/kit` project in Vite 3.0.3+ ([#5861](https://github.com/sveltejs/kit/pull/5861))

## 1.0.0-next.419

### Patch Changes

- Return a 303 response when a `POST` handler provides a `location` ([#5989](https://github.com/sveltejs/kit/pull/5989))
- Generate `__data.json` files for server-side redirects when prerendering ([#5997](https://github.com/sveltejs/kit/pull/5997))
- chore: remove chokidar as dependency of kit ([#5996](https://github.com/sveltejs/kit/pull/5996))
- Use relative asset paths where possible ([#4250](https://github.com/sveltejs/kit/pull/4250))

## 1.0.0-next.418

### Patch Changes

- Prevent double import of env modules ([#5955](https://github.com/sveltejs/kit/pull/5955))
- Tighten up params typings, fix load function typings, add event typings to generated types ([#5974](https://github.com/sveltejs/kit/pull/5974))

## 1.0.0-next.417

### Patch Changes

- Render pages without a .svelte file in their proper layout/error files ([#5972](https://github.com/sveltejs/kit/pull/5972))

## 1.0.0-next.416

### Patch Changes

- fix: allow additional keys in svelte.config.js ([#5961](https://github.com/sveltejs/kit/pull/5961))

## 1.0.0-next.415

### Patch Changes

- breaking: Remove session object ([#5946](https://github.com/sveltejs/kit/pull/5946))

## 1.0.0-next.414

### Patch Changes

- Correctly provide server parent data ([#5916](https://github.com/sveltejs/kit/pull/5916))

## 1.0.0-next.413

### Patch Changes

- feat: `$env/static/*` are now virtual to prevent writing sensitive values to disk ([#5825](https://github.com/sveltejs/kit/pull/5825))

## 1.0.0-next.412

### Patch Changes

- Lazy load Svelte components to reenable no-ssr use cases ([#5930](https://github.com/sveltejs/kit/pull/5930))

## 1.0.0-next.411

### Patch Changes

- Hydration validation errors ([#5918](https://github.com/sveltejs/kit/pull/5918))
- Handle function without params when writing TS proxy ([#5928](https://github.com/sveltejs/kit/pull/5928))
- fix: prevent `Content-Length` header from being incorrectly inherited by requests made from `load`'s `fetch` during SSR ([#5922](https://github.com/sveltejs/kit/pull/5922))
- Provide helpful error message on invalid named layout reference ([#5912](https://github.com/sveltejs/kit/pull/5912))

## 1.0.0-next.410

### Patch Changes

- Fix generated path extension for `AwaitedProperties` ([#5917](https://github.com/sveltejs/kit/pull/5917))

## 1.0.0-next.409

### Patch Changes

- make generated type import path ends in `.js` ([#5907](https://github.com/sveltejs/kit/pull/5907))

## 1.0.0-next.408

### Patch Changes

- Only search for layout name in basename ([#5897](https://github.com/sveltejs/kit/pull/5897))

## 1.0.0-next.407

### Patch Changes

- Allow actions to return undefined ([#5892](https://github.com/sveltejs/kit/pull/5892))
- fix: avoid manifest collisions ([#5874](https://github.com/sveltejs/kit/pull/5874))
- Make package command remove `publishConfig.directory` from generated package.json ([#5848](https://github.com/sveltejs/kit/pull/5848))

## 1.0.0-next.406

### Patch Changes

- breaking: Overhaul filesystem-based router (https://github.com/sveltejs/kit/discussions/5774) ([#5778](https://github.com/sveltejs/kit/pull/5778))
- breaking: Change load API (https://github.com/sveltejs/kit/discussions/5774) ([#5778](https://github.com/sveltejs/kit/pull/5778))

## 1.0.0-next.405

### Patch Changes

- Move `compress` logic to `Builder` API ([#5822](https://github.com/sveltejs/kit/pull/5822))
- feat: implement Link header ([#5735](https://github.com/sveltejs/kit/pull/5735))

## 1.0.0-next.404

### Patch Changes

- Build server without removing `sveltekit` Vite plugin ([#5839](https://github.com/sveltejs/kit/pull/5839))

## 1.0.0-next.403

### Patch Changes

- chore: upgrade to Undici 5.8.1 ([#5804](https://github.com/sveltejs/kit/pull/5804))

## 1.0.0-next.402

### Patch Changes

- fix: Import analysis doesn't get stuck in an infinite loop when encountering cyclical imports ([#5794](https://github.com/sveltejs/kit/pull/5794))

## 1.0.0-next.401

### Patch Changes

- fix: chdir to user's application directory before running postinstall sync ([#5771](https://github.com/sveltejs/kit/pull/5771))

## 1.0.0-next.400

### Patch Changes

- More robust path aliasing ([#5582](https://github.com/sveltejs/kit/pull/5582))

## 1.0.0-next.399

### Patch Changes

- Use @sveltejs/kit postinstall lifecycle hook to invoke 'svelte-kit sync' instead of prepare in projects created by create-svelte ([#5760](https://github.com/sveltejs/kit/pull/5760))

## 1.0.0-next.398

### Patch Changes

- Check url protocol to avoid mailto links navigated by kit in mobile devices ([#5726](https://github.com/sveltejs/kit/pull/5726))
- fix: Windows correctly errors on `$env/*/private` imports and Illegal module analysis in dev ignores non-js|ts|svelte files ([#5739](https://github.com/sveltejs/kit/pull/5739))
- feat: include reference to `@sveltejs/kit` types in ambient file ([#5745](https://github.com/sveltejs/kit/pull/5745))

## 1.0.0-next.397

### Patch Changes

- load env before importing hooks during dev ([#5728](https://github.com/sveltejs/kit/pull/5728))
- Add DOM.Iterable to default tsconfig ([#5734](https://github.com/sveltejs/kit/pull/5734))

## 1.0.0-next.396

### Patch Changes

- fix: Environment variable generated types ([#5719](https://github.com/sveltejs/kit/pull/5719))

## 1.0.0-next.395

### Patch Changes

- Add `$env/static/private`, `$env/static/public`, `$env/dynamic/private` and `$env/dynamic/public` modules ([#5663](https://github.com/sveltejs/kit/pull/5663))

## 1.0.0-next.394

### Patch Changes

- Set Vite's publicDir and correctly serve public assets earlier in pipeline ([#5686](https://github.com/sveltejs/kit/pull/5686))
- prerender in a subprocess ([#5678](https://github.com/sveltejs/kit/pull/5678))

## 1.0.0-next.393

### Patch Changes

- Prevent needless prop updates causing rerenders ([#5671](https://github.com/sveltejs/kit/pull/5671))
- Support custom Vite config locations ([#5705](https://github.com/sveltejs/kit/pull/5705))
- Prevent rerender when route state did not change ([#5654](https://github.com/sveltejs/kit/pull/5654))

## 1.0.0-next.392

### Patch Changes

- Revert publicDir change from 1.0.0-next.387 ([#5683](https://github.com/sveltejs/kit/pull/5683))

## 1.0.0-next.391

### Patch Changes

- breaking: replace transformPage with transformPageChunk ([#5657](https://github.com/sveltejs/kit/pull/5657))

## 1.0.0-next.390

### Patch Changes

- fix: vite dev no longer covers errors ([#5563](https://github.com/sveltejs/kit/pull/5563))

## 1.0.0-next.389

### Patch Changes

- Only normalise internal URLs ([#5645](https://github.com/sveltejs/kit/pull/5645))

## 1.0.0-next.388

### Patch Changes

- Reset stack traces to avoid double-fix ([#5644](https://github.com/sveltejs/kit/pull/5644))

## 1.0.0-next.387

### Patch Changes

- set Vite's `publicDir` option ([#5648](https://github.com/sveltejs/kit/pull/5648))
- Normalize paths inside prerenderer, so they are correct inside \$service-worker ([#5641](https://github.com/sveltejs/kit/pull/5641))

## 1.0.0-next.386

### Patch Changes

- Ensure private cache when something is returned from getSession hook ([#5640](https://github.com/sveltejs/kit/pull/5640))
- fix: transform link[rel=icon] to be absolute to avoid console error when navigating ([#5583](https://github.com/sveltejs/kit/pull/5583))

## 1.0.0-next.385

### Patch Changes

- Make 404 error more helpful if paths.base is missing ([#5622](https://github.com/sveltejs/kit/pull/5622))
- fix: decode parameters on client ([`d02f1f25`](https://github.com/sveltejs/kit/commit/d02f1f25ac8acb29e21a06b94418c333928fb9bb))
- Add config.kit.prerender.origin ([#5627](https://github.com/sveltejs/kit/pull/5627))

## 1.0.0-next.384

### Patch Changes

- Respect custom Vite mode in SSR build ([#5602](https://github.com/sveltejs/kit/pull/5602))
- breaking: remove mode, prod and server from \$app/env ([#5602](https://github.com/sveltejs/kit/pull/5602))

## 1.0.0-next.383

### Patch Changes

- Add formData method in superclass rather than monkey-patch ([#5629](https://github.com/sveltejs/kit/pull/5629))

## 1.0.0-next.382

### Patch Changes

- fix: change Vite's output directory from `_app` to client ([#5620](https://github.com/sveltejs/kit/pull/5620))

## 1.0.0-next.381

### Patch Changes

- Handle errors in Node streams ([#5616](https://github.com/sveltejs/kit/pull/5616))

## 1.0.0-next.380

### Patch Changes

- Handle circular dependencies in dynamic imports ([#5619](https://github.com/sveltejs/kit/pull/5619))
- fix: handle binary data when prerendering ([#5497](https://github.com/sveltejs/kit/pull/5497))
- breaking: remove writeStatic to align with Vite ([#5618](https://github.com/sveltejs/kit/pull/5618))
- Reset navigating store upon return to site with a bfcache hit ([#5613](https://github.com/sveltejs/kit/pull/5613))

## 1.0.0-next.379

### Patch Changes

- Use define instead of import.meta.env.VITE_SVELTEKIT_FOO for internal values ([#5594](https://github.com/sveltejs/kit/pull/5594))

## 1.0.0-next.378

### Patch Changes

- Pause Node streams as necessary when converting to ReadableStream ([#5587](https://github.com/sveltejs/kit/pull/5587))
- improve vite version check to work with custom resolutions, eg. pnpm overrides ([#5586](https://github.com/sveltejs/kit/pull/5586))

## 1.0.0-next.377

### Patch Changes

- breaking: Endpoint method names uppercased to match HTTP specifications ([#5513](https://github.com/sveltejs/kit/pull/5513))

## 1.0.0-next.376

### Patch Changes

- fix: ensure completed_build is reset ([#5541](https://github.com/sveltejs/kit/pull/5541))

## 1.0.0-next.375

### Patch Changes

- fix: don't try adapting if build failed ([#5536](https://github.com/sveltejs/kit/pull/5536))
- Render generic error page if `__layout` returns error while rendering full error page ([#4665](https://github.com/sveltejs/kit/pull/4665))

## 1.0.0-next.374

### Patch Changes

- removed `vite` key from config definition ([#5530](https://github.com/sveltejs/kit/pull/5530))
- Render page with correct status code when non-get endpoint returns validation error ([#4328](https://github.com/sveltejs/kit/pull/4328))

## 1.0.0-next.373

### Patch Changes

- breaking: require vite 3 ([#5005](https://github.com/sveltejs/kit/pull/5005))

## 1.0.0-next.372

### Patch Changes

- ignore invalid accept header values instead of throwing an error ([#5502](https://github.com/sveltejs/kit/pull/5502))
- support CSP report-only mode ([#5496](https://github.com/sveltejs/kit/pull/5496))

## 1.0.0-next.371

### Patch Changes

- Pin vite-plugin-svelte to 1.0.0-next.49 ([#5498](https://github.com/sveltejs/kit/pull/5498))

## 1.0.0-next.370

### Patch Changes

- Don't automatically buffer request bodies ([#5442](https://github.com/sveltejs/kit/pull/5442))

## 1.0.0-next.369

### Patch Changes

- skip closeBundle hook during dev to prevent errors on restart ([#5466](https://github.com/sveltejs/kit/pull/5466))
- Normalize paths on prefetch (fixes [#5457](https://github.com/sveltejs/kit/issues/5457)) ([#5458](https://github.com/sveltejs/kit/pull/5458))
- clearer error on bad matcher names ([#5460](https://github.com/sveltejs/kit/pull/5460))

## 1.0.0-next.368

### Patch Changes

- fix: adapt in closeBundle ([#5439](https://github.com/sveltejs/kit/pull/5439))

## 1.0.0-next.367

### Patch Changes

- fix: allow Vite plugins to output mutable assets ([#5416](https://github.com/sveltejs/kit/pull/5416))

## 1.0.0-next.366

### Patch Changes

- reset selection in setTimeout after navigating, to ensure correct behaviour in Firefox ([#5058](https://github.com/sveltejs/kit/pull/5058))

## 1.0.0-next.365

### Patch Changes

- Serve static assets before routes in dev, but only if in an allowed directory ([#5070](https://github.com/sveltejs/kit/pull/5070))
- breaking: Allow %-encoded filenames ([#5056](https://github.com/sveltejs/kit/pull/5056))

## 1.0.0-next.364

### Patch Changes

- breaking: Use Vite defaults for port and strictPort ([#5392](https://github.com/sveltejs/kit/pull/5392))
- Use anonymous function in service worker init script to support legacy browsers ([#5417](https://github.com/sveltejs/kit/pull/5417))

## 1.0.0-next.363

### Patch Changes

- chore: upgrade TypeScript to 4.7.4 ([#5414](https://github.com/sveltejs/kit/pull/5414))

## 1.0.0-next.362

### Patch Changes

- Updated undici to fix #5383 ([#5420](https://github.com/sveltejs/kit/pull/5420))

## 1.0.0-next.361

### Patch Changes

- breaking: require Node 16.9 ([#5395](https://github.com/sveltejs/kit/pull/5395))
- remove FLoC protection, now that we vanquished Google ([#5018](https://github.com/sveltejs/kit/pull/5018))
- Prevent `Connection` header from being incorrectly inherited by requests made from `load`'s `fetch` during SSR ([#5393](https://github.com/sveltejs/kit/pull/5393))
- Returns errors from page endpoints as JSON where appropriate ([#5314](https://github.com/sveltejs/kit/pull/5314))
- Allow body to be a binary ReadableStream ([#5407](https://github.com/sveltejs/kit/pull/5407))

## 1.0.0-next.360

### Patch Changes

- fix: support conditional Vite configs ([#5376](https://github.com/sveltejs/kit/pull/5376))
- Allow server restart when config changed ([#5379](https://github.com/sveltejs/kit/pull/5379))
- Include dynamically imported styles during SSR ([#5138](https://github.com/sveltejs/kit/pull/5138))

## 1.0.0-next.359

### Patch Changes

- Adjust type imports to satisfy TS NodeNext moduleResolution ([#5360](https://github.com/sveltejs/kit/pull/5360))
- breaking: require vite.config.js ([#5332](https://github.com/sveltejs/kit/pull/5332))
- breaking: graduate @sveltejs/kit/vite from experimental ([#5332](https://github.com/sveltejs/kit/pull/5332))
- breaking: switch to vite CLI for dev, build, and preview commands ([#5332](https://github.com/sveltejs/kit/pull/5332))

## 1.0.0-next.358

### Patch Changes

- Only exit process in closeBundle hook if prerender is enabled ([#5356](https://github.com/sveltejs/kit/pull/5356))
- fix: don't log warning if root is configured ([#5330](https://github.com/sveltejs/kit/pull/5330))

## 1.0.0-next.357

### Patch Changes

- breaking: change endpointExtensions to moduleExtensions, and use to filter param matchers ([#5085](https://github.com/sveltejs/kit/pull/5085))
- fix server crash when accessing a malformed URI ([#5246](https://github.com/sveltejs/kit/pull/5246))

## 1.0.0-next.356

### Patch Changes

- Stream request bodies ([#5291](https://github.com/sveltejs/kit/pull/5291))
- Enable multipart formdata parsing with node-fetch ([#5292](https://github.com/sveltejs/kit/pull/5292))
- fix: allow user to set dev port ([#5303](https://github.com/sveltejs/kit/pull/5303))
- breaking: use undici instead of node-fetch ([#5117](https://github.com/sveltejs/kit/pull/5117))

## 1.0.0-next.355

### Patch Changes

- chore: Prerendering URL is now a subclass instead of a proxy ([#5278](https://github.com/sveltejs/kit/pull/5278))
- fix: support vite.config.js on Windows ([#5265](https://github.com/sveltejs/kit/pull/5265))
- Allow both string and URL as the first argument of `$app/navigation#goto` ([#5282](https://github.com/sveltejs/kit/pull/5282))
- rename `goto(href)` to `goto(url)` ([#5286](https://github.com/sveltejs/kit/pull/5286))
- Add types for @sveltejs/kit/experimental/vite ([#5266](https://github.com/sveltejs/kit/pull/5266))
- fix: port flag doesn't work in preview ([#5284](https://github.com/sveltejs/kit/pull/5284))

## 1.0.0-next.354

### Patch Changes

- Added `server` and `prod` env variables ([#5251](https://github.com/sveltejs/kit/pull/5251))

## 1.0.0-next.353

### Patch Changes

- Expose Vite plugin as @sveltejs/kit/experimental/vite ([#5094](https://github.com/sveltejs/kit/pull/5094))

## 1.0.0-next.352

### Patch Changes

- fix manifest not updating when adding routes ([#5157](https://github.com/sveltejs/kit/pull/5157))

## 1.0.0-next.351

### Patch Changes

- fix: URL instance methods now work in `load` ([#5183](https://github.com/sveltejs/kit/pull/5183))
- Upgrade vite-plugin-svelte ([`4e4625ea`](https://github.com/sveltejs/kit/commit/4e4625ea6d9a084bc767ae216704aacd95fe8730))

## 1.0.0-next.350

### Patch Changes

- breaking: revert removal of `kit.browser.hydrate` ([#5178](https://github.com/sveltejs/kit/pull/5178))

## 1.0.0-next.349

### Patch Changes

- breaking: remove kit.browser.hydrate config in favor of compilerOptions.hydratable ([#5155](https://github.com/sveltejs/kit/pull/5155))
- chore: upgrade to Vite 2.9.10 ([#5170](https://github.com/sveltejs/kit/pull/5170))

## 1.0.0-next.348

### Patch Changes

- Disallow access to `__data.json` for standalone endpoints ([#5149](https://github.com/sveltejs/kit/pull/5149))
- chore: introduce `KitConfig` type ([#5141](https://github.com/sveltejs/kit/pull/5141))
- Prevent incorrect redirect for `__data.json` request with `trailingSlash: 'always'` ([#5149](https://github.com/sveltejs/kit/pull/5149))

## 1.0.0-next.347

### Patch Changes

- Update dependencies ([#5121](https://github.com/sveltejs/kit/pull/5121))
- allow symlinked static assets in dev ([#5089](https://github.com/sveltejs/kit/pull/5089))

## 1.0.0-next.346

### Patch Changes

- chore: provide Vite config via plugin ([#5073](https://github.com/sveltejs/kit/pull/5073))
- Reload page to recover from HMR errors ([#5108](https://github.com/sveltejs/kit/pull/5108))
- chore: shared Vite build config ([#5105](https://github.com/sveltejs/kit/pull/5105))
- fix `BodyValidator` handling for nested object literals ([#5118](https://github.com/sveltejs/kit/pull/5118))
- fix: don't set `credentials` to `undefined` in server-side `fetch` ([#5116](https://github.com/sveltejs/kit/pull/5116))

## 1.0.0-next.345

### Patch Changes

- Prevent component double mounting caused by HMR invalidation ([#4891](https://github.com/sveltejs/kit/pull/4891))
- Only recreate manifest when files inside `config.kit.files.routes` are added or deleted ([#5076](https://github.com/sveltejs/kit/pull/5076))

## 1.0.0-next.344

### Patch Changes

- fix: svelte-kit sync no longer permanently deletes the types directory ([#5063](https://github.com/sveltejs/kit/pull/5063))
- chore: trigger sync and other setup from plugin ([#5067](https://github.com/sveltejs/kit/pull/5067))
- Update `engines` to specify that Node 16.7 is required ([#5062](https://github.com/sveltejs/kit/pull/5062))
- only serve `_app/immutable` with immutable cache header, not `_app/version.json` ([#5051](https://github.com/sveltejs/kit/pull/5051))

## 1.0.0-next.343

### Patch Changes

- chore: return config from server start methods ([#5043](https://github.com/sveltejs/kit/pull/5043))

## 1.0.0-next.342

### Patch Changes

- ensure static assets are only served if correct case is used ([#5047](https://github.com/sveltejs/kit/pull/5047))
- breaking: stop suppressing `/favicon.ico` requests, handle them as a valid route ([#5046](https://github.com/sveltejs/kit/pull/5046))
- don't warn about window.fetch during hydration ([#5041](https://github.com/sveltejs/kit/pull/5041))

## 1.0.0-next.341

### Patch Changes

- fix: page store correct after navigation when an identical route with a different hash had been prefetched ([#5039](https://github.com/sveltejs/kit/pull/5039))
- breaking: replace @sveltejs/kit/install-fetch with @sveltejs/kit/node/polyfills ([#4934](https://github.com/sveltejs/kit/pull/4934))
- fix: Prerendered pages fail if they access session. ([#4811](https://github.com/sveltejs/kit/pull/4811))

## 1.0.0-next.340

### Patch Changes

- feat: Pages marked for prerendering fail during ssr at runtime ([#4812](https://github.com/sveltejs/kit/pull/4812))
- Throw load validation errors so that they are caught by handleError ([#4953](https://github.com/sveltejs/kit/pull/4953))
- Allow symlinked directories in the routes folder ([#4957](https://github.com/sveltejs/kit/pull/4957))
- breaking: Rename LoadInput to LoadEvent ([#5015](https://github.com/sveltejs/kit/pull/5015))
- allow disableScrollHandling to be called in afterNavigate ([#4948](https://github.com/sveltejs/kit/pull/4948))
- Add `config.kit.alias` ([#4964](https://github.com/sveltejs/kit/pull/4964))
- use namespace import for vite to support upcoming vite 3.0 esm ([#5030](https://github.com/sveltejs/kit/pull/5030))

## 1.0.0-next.339

### Patch Changes

- breaking: resolve relative urls from the target page when using load's fetch ([#5025](https://github.com/sveltejs/kit/pull/5025))
- fix: `svelte-kit sync` gracefully handles a nonexistent routes folder ([#5020](https://github.com/sveltejs/kit/pull/5020))
- breaking: Replace `%svelte.body%` with `%sveltekit.body%`, etc. ([#5016](https://github.com/sveltejs/kit/pull/5016))

## 1.0.0-next.338

### Patch Changes

- breaking: remove amp config option in favour of amp.transform helper function ([#4710](https://github.com/sveltejs/kit/pull/4710))
- breaking: accessing url.hash from load now results in a helpful error ([#4983](https://github.com/sveltejs/kit/pull/4983))

## 1.0.0-next.337

### Patch Changes

- fix: don't watch `outDir`, except for the `generated` directory ([#4997](https://github.com/sveltejs/kit/pull/4997))
- Warn if load uses window.fetch ([#4958](https://github.com/sveltejs/kit/pull/4958))
- Only run `viteServeStaticMiddleware` after server has attempted response ([#4974](https://github.com/sveltejs/kit/pull/4974))

## 1.0.0-next.336

### Patch Changes

- Pass config to vite-plugin-svelte instead of reloading it ([#4760](https://github.com/sveltejs/kit/pull/4760))
- fix FOUC regression during dev ([#4990](https://github.com/sveltejs/kit/pull/4990))
- move `RequestEvent` and `ResolveOptions` as public types ([#4809](https://github.com/sveltejs/kit/pull/4809))
- breaking: write generated types to `__types` directories ([#4705](https://github.com/sveltejs/kit/pull/4705))

## 1.0.0-next.335

### Patch Changes

- breaking: change data-hydrate to data-sveltekit-hydrate ([#4972](https://github.com/sveltejs/kit/pull/4972))
- Fix default port override ([#4970](https://github.com/sveltejs/kit/pull/4970))

## 1.0.0-next.334

### Patch Changes

- fix: deduplicate injected css during dev ([#4920](https://github.com/sveltejs/kit/pull/4920))

## 1.0.0-next.333

### Patch Changes

- breaking: delay automatic service worker registration until load event ([#4950](https://github.com/sveltejs/kit/pull/4950))

## 1.0.0-next.332

### Patch Changes

- Revert dev command default options ([#4949](https://github.com/sveltejs/kit/pull/4949))

## 1.0.0-next.331

### Patch Changes

- fix `BodyValidator` for nested interfaces ([#4939](https://github.com/sveltejs/kit/pull/4939))
- breaking: drop Node 14 support ([#4922](https://github.com/sveltejs/kit/pull/4922))
- only skip files that were already written when prerendering ([#4928](https://github.com/sveltejs/kit/pull/4928))
- Set default options for dev command ([#4932](https://github.com/sveltejs/kit/pull/4932))

## 1.0.0-next.330

### Patch Changes

- Fix Safari scroll bug on ssr:false page reload ([#4846](https://github.com/sveltejs/kit/pull/4846))

## 1.0.0-next.329

### Patch Changes

- fix: stop flash of unstyled content when using CSS flavours ([#4882](https://github.com/sveltejs/kit/pull/4882))
- delegate `RequestHandler` generics `Body` validation ([#4897](https://github.com/sveltejs/kit/pull/4897))
- feat: more specific types for `kit.prerender.entries` config ([#4880](https://github.com/sveltejs/kit/pull/4880))
- Prevent unhandled rejections when loading page modules ([#4732](https://github.com/sveltejs/kit/pull/4732))

## 1.0.0-next.328

### Patch Changes

- Print useful 404 response when requesting unprefixed path in preview ([#4751](https://github.com/sveltejs/kit/pull/4751))
- Prevent naive path normalization during prerendering ([#4761](https://github.com/sveltejs/kit/pull/4761))

## 1.0.0-next.327

### Patch Changes

- generate tsconfig when running svelte-kit package ([#4824](https://github.com/sveltejs/kit/pull/4824))

## 1.0.0-next.326

### Patch Changes

- breaking: add lib, module, and target to generated tsconfig ([#4791](https://github.com/sveltejs/kit/pull/4791))

## 1.0.0-next.325

### Patch Changes

- Display network logs in node 18 ([#4778](https://github.com/sveltejs/kit/pull/4778))

## 1.0.0-next.324

### Patch Changes

- Throw errors on encountering named layout in directory ([#4756](https://github.com/sveltejs/kit/pull/4756))

## 1.0.0-next.323

### Patch Changes

- Default to target: node14.8, so that top-level await is supported in user code ([#4742](https://github.com/sveltejs/kit/pull/4742))
- Only complain about missing \$lib paths in tsconfig if src/lib exists ([#4735](https://github.com/sveltejs/kit/pull/4735))
- Include all assets in `$service-worker` build, not just CSS ([#4744](https://github.com/sveltejs/kit/pull/4744))

## 1.0.0-next.322

### Patch Changes

- Copy dotfiles from .svelte-kit/output ([#4725](https://github.com/sveltejs/kit/pull/4725))
- breaking: Ignore `trailingSlash` for endpoint requests, apply `trailingSlash` to pages consistently ([#4699](https://github.com/sveltejs/kit/pull/4699))

## 1.0.0-next.321

### Patch Changes

- Tweak error message for non-validating base paths ([#4713](https://github.com/sveltejs/kit/pull/4713))
- breaking: Supplying an empty `--host` option to `preview` exposes the server to both ipv4 and ipv6 networks ([#4729](https://github.com/sveltejs/kit/pull/4729))
- throw error on encountering infinite layout loop ([#4730](https://github.com/sveltejs/kit/pull/4730))

## 1.0.0-next.320

### Patch Changes

- breaking: Replace `maxage` with `cache` in `LoadOutput` ([#4690](https://github.com/sveltejs/kit/pull/4690))

## 1.0.0-next.319

### Patch Changes

- Add --watch flag to svelte-kit package ([#4658](https://github.com/sveltejs/kit/pull/4658))

## 1.0.0-next.318

### Patch Changes

- fix broken AdapterEntry type ([#4674](https://github.com/sveltejs/kit/pull/4674))

## 1.0.0-next.317

### Patch Changes

- Navigation to current URL is no longer a no-op ([#4664](https://github.com/sveltejs/kit/pull/4664))
- builder.createEntries returns a promise that awaits complete() callbacks ([#4663](https://github.com/sveltejs/kit/pull/4663))
- navigation store resets to null after aborted nav ([#4664](https://github.com/sveltejs/kit/pull/4664))

## 1.0.0-next.316

### Patch Changes

- `invalidate` with `predicate` function ([#4636](https://github.com/sveltejs/kit/pull/4636))

## 1.0.0-next.315

### Patch Changes

- Apply set-cookie headers from page dependencies ([#4588](https://github.com/sveltejs/kit/pull/4588))
- Include disallowed method name in 405 response, include Allow header ([#4614](https://github.com/sveltejs/kit/pull/4614))
- apply updated `props.page` when update or goto page ([#4392](https://github.com/sveltejs/kit/pull/4392))
- rename `data-svelte` attribute to `data-sveltekit` ([#4641](https://github.com/sveltejs/kit/pull/4641))

## 1.0.0-next.314

### Patch Changes

- Custom `load` `dependencies` in `LoadOutput` ([#4536](https://github.com/sveltejs/kit/pull/4536))
- Made LoadInput and LoadOutput types public, merged ErrorLoad and Load declarations ([#4515](https://github.com/sveltejs/kit/pull/4515))

## 1.0.0-next.313

### Patch Changes

- add `platform` to requests triggered by `fetch` in `load` during SSR ([#4599](https://github.com/sveltejs/kit/pull/4599))

## 1.0.0-next.312

### Patch Changes

- Only render fallback when prerendering is enabled ([#4604](https://github.com/sveltejs/kit/pull/4604))

## 1.0.0-next.311

### Patch Changes

- Skip client-side navigation for links with sveltekit:reload ([#4545](https://github.com/sveltejs/kit/pull/4545))
- breaking: Skip prerendering for rel="external" links ([#4545](https://github.com/sveltejs/kit/pull/4545))

## 1.0.0-next.310

### Patch Changes

- Remove credentials when creating request object in server-side fetch ([#4548](https://github.com/sveltejs/kit/pull/4548))

## 1.0.0-next.309

### Patch Changes

- Fix session store subscription tracking during SSR ([#4550](https://github.com/sveltejs/kit/pull/4550))

## 1.0.0-next.308

### Patch Changes

- Remove `static` directory from Vite's control ([#4535](https://github.com/sveltejs/kit/pull/4535))

## 1.0.0-next.307

### Patch Changes

- Allow index files to use named layouts ([#4527](https://github.com/sveltejs/kit/pull/4527))
- Respect ssr option when rendering 404 page ([#4513](https://github.com/sveltejs/kit/pull/4513))
- Remove unimplemented option from CLI ([#4507](https://github.com/sveltejs/kit/pull/4507))
- Move MaybePromise from RequestHandlerOutput to RequestHandler return value ([#4519](https://github.com/sveltejs/kit/pull/4519))

## 1.0.0-next.306

### Patch Changes

- Hint if `paths.base` is missing in dev ([#4510](https://github.com/sveltejs/kit/pull/4510))
- Respect `paths.base` when using `--open` ([#4510](https://github.com/sveltejs/kit/pull/4510))
- breaking: Add named layouts, remove `__layout.reset` ([#4388](https://github.com/sveltejs/kit/pull/4388))

## 1.0.0-next.305

### Patch Changes

- Generate correct types for routes with parameter matchers ([#4472](https://github.com/sveltejs/kit/pull/4472))

## 1.0.0-next.304

### Patch Changes

- Upgrade to Vite 2.9 ([#4468](https://github.com/sveltejs/kit/pull/4468))
- allow files and directories named `__tests__` and `__test__` in the routes directory ([#4438](https://github.com/sveltejs/kit/pull/4438))
- Create fallback page when prerendering is disabled ([#4443](https://github.com/sveltejs/kit/pull/4443))

## 1.0.0-next.303

### Patch Changes

- fix: don't use client-side navigation when clicking on a link to the same path on a different origin ([#4433](https://github.com/sveltejs/kit/pull/4433))

## 1.0.0-next.302

### Patch Changes

- fix: don't redirect to external URLs when normalizing paths ([#4414](https://github.com/sveltejs/kit/pull/4414))
- Fix error link for fallthrough replacement ([#4408](https://github.com/sveltejs/kit/pull/4408))

## 1.0.0-next.301

### Patch Changes

- Skip svelte-kit sync if no config file exists yet ([#4372](https://github.com/sveltejs/kit/pull/4372))

## 1.0.0-next.300

### Patch Changes

- fix: correctly populate `event.url.host` in dev mode when using `--https` ([#4364](https://github.com/sveltejs/kit/pull/4364))
- fix rest param type generation ([#4361](https://github.com/sveltejs/kit/pull/4361))
- breaking: Rename validators to matchers ([#4358](https://github.com/sveltejs/kit/pull/4358))

## 1.0.0-next.299

### Patch Changes

- Populate fallback page when trailingSlash is "always" ([#4351](https://github.com/sveltejs/kit/pull/4351))
- Expose `event.routeId` and `page.routeId` ([#4345](https://github.com/sveltejs/kit/pull/4345))
- breaking: remove fallthrough routes ([#4330](https://github.com/sveltejs/kit/pull/4330))
- Add param validators ([#4334](https://github.com/sveltejs/kit/pull/4334))
- breaking: disallow \$ character in dynamic parameters ([#4334](https://github.com/sveltejs/kit/pull/4334))
- Populate event.params before calling handle ([#4344](https://github.com/sveltejs/kit/pull/4344))

## 1.0.0-next.298

### Patch Changes

- fix: correctly detect removal of route ([#4333](https://github.com/sveltejs/kit/pull/4333))

## 1.0.0-next.297

### Patch Changes

- breaking: allow `InputProps` and `OutputProps` to be typed separately in generated `Load` ([#4305](https://github.com/sveltejs/kit/pull/4305))
- allow `Output` to be typed in generated `RequestHandler` ([#4305](https://github.com/sveltejs/kit/pull/4305))
- breaking: require adapters to supply a getClientAddress function ([#4289](https://github.com/sveltejs/kit/pull/4289))
- Allow page endpoint without GET handler ([#4318](https://github.com/sveltejs/kit/pull/4318))
- Return 404 when fetching missing data during prerender ([#4324](https://github.com/sveltejs/kit/pull/4324))
- expose client IP address as event.clientAddress ([#4289](https://github.com/sveltejs/kit/pull/4289))

## 1.0.0-next.296

### Patch Changes

- Allow adapter.adapt to be synchronous ([#4299](https://github.com/sveltejs/kit/pull/4299))
- Make `manifest.mimeTypes` part of the public API ([#4302](https://github.com/sveltejs/kit/pull/4302))
- load hooks after server initialisation, to ensure `prerendering` is correct ([#4322](https://github.com/sveltejs/kit/pull/4322))

## 1.0.0-next.295

### Patch Changes

- fix error message for invalid request object ([#4277](https://github.com/sveltejs/kit/pull/4277))
- Handle explicit redirects from endpoints ([#4260](https://github.com/sveltejs/kit/pull/4260))
- Allow routes with the same name as fallback components ([#4284](https://github.com/sveltejs/kit/pull/4284))

## 1.0.0-next.294

### Patch Changes

- breaking: Replace timestamp in \$service-worker with version ([#4213](https://github.com/sveltejs/kit/pull/4213))
- Remove declared `$lib` module ([#4227](https://github.com/sveltejs/kit/pull/4227))

## 1.0.0-next.293

### Patch Changes

- Expose Server and SSRManifest as public types ([#4220](https://github.com/sveltejs/kit/pull/4220))
- fetch `version.json` relative to `paths.assets`, if set ([#4234](https://github.com/sveltejs/kit/pull/4234))

## 1.0.0-next.292

### Patch Changes

- Prevent Vite from copying static assets if directory is called "public" ([#4214](https://github.com/sveltejs/kit/pull/4214))
- Add sync CLI command ([#4182](https://github.com/sveltejs/kit/pull/4182))
- breaking: expose entire config to adapters, rather than just appDir and trailingSlash ([#4192](https://github.com/sveltejs/kit/pull/4192))
- breaking: replace builder.prerender() with builder.writePrerendered() and builder.prerendered ([#4192](https://github.com/sveltejs/kit/pull/4192))
- breaking: prerender pages during build, regardless of adapter ([#4192](https://github.com/sveltejs/kit/pull/4192))
- Add config.kit.prerender.default option ([#4192](https://github.com/sveltejs/kit/pull/4192))
- Ensure props are loaded from matching endpoint during client-side navigation ([#4203](https://github.com/sveltejs/kit/pull/4203))
- Use prerendered pages in svelte-kit preview ([#4192](https://github.com/sveltejs/kit/pull/4192))
- Upgrade to TypeScript 4.6 ([#4190](https://github.com/sveltejs/kit/pull/4190))
- Fix `svelte-kit preview` ([#4207](https://github.com/sveltejs/kit/pull/4207))
- Make prerendered paths available to service workers ([#4192](https://github.com/sveltejs/kit/pull/4192))
- Update history immediately before updating DOM ([#4191](https://github.com/sveltejs/kit/pull/4191))
- Add config.kit.endpointExtensions option ([#4197](https://github.com/sveltejs/kit/pull/4197))

## 1.0.0-next.291

### Patch Changes

- Focus on `body` instead of `html` on navigation due to issues on Firefox ([#4184](https://github.com/sveltejs/kit/pull/4184))

## 1.0.0-next.290

### Patch Changes

- Add config.kit.outDir ([#4176](https://github.com/sveltejs/kit/pull/4176))
- breaking: allow `InputProps` and `OutputProps` to be typed separately in `Load` ([#4160](https://github.com/sveltejs/kit/pull/4160))

## 1.0.0-next.289

### Patch Changes

- Only fall back to full page reload if pathname has changed ([#4116](https://github.com/sveltejs/kit/pull/4116))
- Generate types for each page/endpoint ([#4120](https://github.com/sveltejs/kit/pull/4120))
- Extend user tsconfig from generated .svelte-kit/tsconfig.json ([#4118](https://github.com/sveltejs/kit/pull/4118))

## 1.0.0-next.288

### Patch Changes

- Fix XSS vulnerability on SSR pages with fetched data on `load()` ([#4128](https://github.com/sveltejs/kit/pull/4128))
- breaking: `tabindex="-1"` is no longer added to `<body>`; `<html>` only briefly receives it during navigation ([#4140](https://github.com/sveltejs/kit/pull/4140))
- `RequestHandlerOutput` accepts body when it has or maybe is `undefined` ([#4152](https://github.com/sveltejs/kit/pull/4152))

## 1.0.0-next.287

### Patch Changes

- breaking: Rename `__fetch_polyfill` to `installFetch`, remove fetch exports ([#4111](https://github.com/sveltejs/kit/pull/4111))

## 1.0.0-next.286

### Patch Changes

- Prevent double-fixing of error stack traces in dev mode ([#4041](https://github.com/sveltejs/kit/pull/4041))
- Expose Navigation type ([#4076](https://github.com/sveltejs/kit/pull/4076))
- add new `Page` type ([#4076](https://github.com/sveltejs/kit/pull/4076))
- breaking: separate public from private-but-documented types ([#4104](https://github.com/sveltejs/kit/pull/4104))

## 1.0.0-next.285

### Patch Changes

- breaking: referer header sent by fetch in load matches page's referer header, not the page itself ([#4070](https://github.com/sveltejs/kit/pull/4070))
- breaking: remove sveltekit:navigation-{start,end} events ([#4070](https://github.com/sveltejs/kit/pull/4070))
- breaking: defer pushState until navigation occurs ([#4070](https://github.com/sveltejs/kit/pull/4070))

## 1.0.0-next.284

### Patch Changes

- Disable meta http-equiv tags for static amp configuration ([#4073](https://github.com/sveltejs/kit/pull/4073))
- Ignore click event if url does not have origin (e.g. `mailto:`, `tel:`) ([#4072](https://github.com/sveltejs/kit/pull/4072))

## 1.0.0-next.283

### Patch Changes

- create `__data.json` for pathnames with trailing slashes, including `/` ([#4066](https://github.com/sveltejs/kit/pull/4066))

## 1.0.0-next.282

### Patch Changes

- fix: remove private methods to make Safari 14.1 work ([#4054](https://github.com/sveltejs/kit/pull/4054))

## 1.0.0-next.281

### Patch Changes

- Allow the `transformPage` resolve option to return a promise ([#4036](https://github.com/sveltejs/kit/pull/4036))

## 1.0.0-next.280

### Patch Changes

- breaking: rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))
- breaking: allow providing `Params` type argument for `RequestHandler` ([#3989](https://github.com/sveltejs/kit/pull/3989))

## 1.0.0-next.279

### Patch Changes

- Fix escaped html attributes ([#4015](https://github.com/sveltejs/kit/pull/4015))

## 1.0.0-next.278

### Patch Changes

- breaking: Crawl rel="external" links when prerendering ([#3826](https://github.com/sveltejs/kit/pull/3826))

## 1.0.0-next.277

### Patch Changes

- Fall back to full page reload if link href does not match route manifest ([#3969](https://github.com/sveltejs/kit/pull/3969))
- Update page store without rerunning load when hash changes ([#3975](https://github.com/sveltejs/kit/pull/3975))

## 1.0.0-next.276

### Patch Changes

- Track scroll position without scroll listener, and recover on reload ([#3938](https://github.com/sveltejs/kit/pull/3938))

## 1.0.0-next.275

### Patch Changes

- Invalidate shadow endpoint data when URL changes ([#3925](https://github.com/sveltejs/kit/pull/3925))

## 1.0.0-next.274

### Patch Changes

- Set `$page.url` to current URL in browser ([#3942](https://github.com/sveltejs/kit/pull/3942))

## 1.0.0-next.273

### Patch Changes

- Correctly identify readable node streams ([#3941](https://github.com/sveltejs/kit/pull/3941))
- remove 'Shadow' from error message ([#3943](https://github.com/sveltejs/kit/pull/3943))

## 1.0.0-next.272

### Patch Changes

- Make shadow endpoint `event.url` consistent between server and client navigation ([#3780](https://github.com/sveltejs/kit/pull/3780))
- Prevent duplicated history when navigating via hash link ([#3931](https://github.com/sveltejs/kit/pull/3931))

## 1.0.0-next.271

### Patch Changes

- Add `transformPage` option to `resolve` ([#3914](https://github.com/sveltejs/kit/pull/3914))

## 1.0.0-next.270

### Patch Changes

- handle HEAD requests in endpoints ([#3903](https://github.com/sveltejs/kit/pull/3903))
- Use shadow endpoint without defining a `get` endpoint ([#3816](https://github.com/sveltejs/kit/pull/3816))

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
- fix: avoid mutating response `Headers` ([#3829](https://github.com/sveltejs/kit/pull/3829))

## 1.0.0-next.265

### Patch Changes

- breaking: remove `createIndexFiles` option, derive from `trailingSlash` instead ([#3801](https://github.com/sveltejs/kit/pull/3801))
- Pass trailingSlash config to adapters ([#3820](https://github.com/sveltejs/kit/pull/3820))

## 1.0.0-next.264

### Patch Changes

- fix links pointing to multi-page docs ([#3815](https://github.com/sveltejs/kit/pull/3815))
- upgrade to TypeScript 4.5 ([#3809](https://github.com/sveltejs/kit/pull/3809))

## 1.0.0-next.263

### Patch Changes

- Handle numeric headers ([#3716](https://github.com/sveltejs/kit/pull/3716))
- fix: replace broken escaping with a working version ([#3798](https://github.com/sveltejs/kit/pull/3798))

## 1.0.0-next.262

### Patch Changes

- update to Vite 2.8 and esbuild 0.14 ([#3791](https://github.com/sveltejs/kit/pull/3791))

## 1.0.0-next.261

### Patch Changes

- Prevent full reload when router navigates and only removes hash ([#3757](https://github.com/sveltejs/kit/pull/3757))
- fixes shadow hydration escaping ([#3793](https://github.com/sveltejs/kit/pull/3793))
- fixes an error with fetching shadow endpoints if they are ending with '/' ([#3740](https://github.com/sveltejs/kit/pull/3740))

## 1.0.0-next.260

### Patch Changes

- Allow Response object to be returned without properties showing up in object constructor ([#3697](https://github.com/sveltejs/kit/pull/3697))
- Implement shadow endpoints ([#3679](https://github.com/sveltejs/kit/pull/3679))

## 1.0.0-next.259

### Patch Changes

- Prevent `Host` header from being incorrectly inherited by requests made from `load`'s `fetch` during SSR ([#3690](https://github.com/sveltejs/kit/pull/3690))

## 1.0.0-next.258

### Patch Changes

- Update \$app/stores page.stuff to use App.Stuff ([#3686](https://github.com/sveltejs/kit/pull/3686))

## 1.0.0-next.257

### Patch Changes

- Rename JSONString type to JSONValue ([#3683](https://github.com/sveltejs/kit/pull/3683))
- Add App namespace for app-level types ([#3670](https://github.com/sveltejs/kit/pull/3670))
- breaking: remove target option ([#3674](https://github.com/sveltejs/kit/pull/3674))

## 1.0.0-next.256

### Patch Changes

- fix regression in parsing HTML when crawling for pre-rendering ([#3677](https://github.com/sveltejs/kit/pull/3677))

## 1.0.0-next.255

### Patch Changes

- fix parsing during pre-render crawl when there are HTML attributes without a value ([#3668](https://github.com/sveltejs/kit/pull/3668))
- Correctly populate asset manifest when generating service worker ([#3673](https://github.com/sveltejs/kit/pull/3673))

## 1.0.0-next.254

### Patch Changes

- Add version config and expose updated store ([#3412](https://github.com/sveltejs/kit/pull/3412))
- fix: update types to match changes to Vite config handling ([#3662](https://github.com/sveltejs/kit/pull/3662))

## 1.0.0-next.253

### Patch Changes

- Allow config.kit.vite to be an async function ([#3565](https://github.com/sveltejs/kit/pull/3565))
- Include page request headers in server-side fetches ([#3631](https://github.com/sveltejs/kit/pull/3631))

## 1.0.0-next.252

### Patch Changes

- remove nonexistent `url` store from `$app/stores` ambient types ([#3640](https://github.com/sveltejs/kit/pull/3640))

## 1.0.0-next.251

### Patch Changes

- Handle non-compliant ReadableStream implementations ([#3624](https://github.com/sveltejs/kit/pull/3624))

## 1.0.0-next.250

### Patch Changes

- breaking: move `config.kit.hydrate` and `config.kit.router` to `config.kit.browser` ([#3578](https://github.com/sveltejs/kit/pull/3578))
- add `prerender.createIndexFiles` option ([#2632](https://github.com/sveltejs/kit/pull/2632))

## 1.0.0-next.249

### Patch Changes

- Include service worker in manifest ([#3570](https://github.com/sveltejs/kit/pull/3570))
- Add kit.routes config to customise public/private modules ([#3576](https://github.com/sveltejs/kit/pull/3576))

## 1.0.0-next.248

### Patch Changes

- Decode fetched resources before checking against manifest when prerendering ([#3571](https://github.com/sveltejs/kit/pull/3571))
- breaking: remove -H and (conflicting) -h shortcuts from CLI ([#3573](https://github.com/sveltejs/kit/pull/3573))

## 1.0.0-next.247

### Patch Changes

- fix handling an incoming request from HTTP/2 ([#3572](https://github.com/sveltejs/kit/pull/3572))

## 1.0.0-next.246

### Patch Changes

- `svelte-kit package` gives clearer error message when svelte2tsx and typescript are not installed ([#3562](https://github.com/sveltejs/kit/pull/3562))
- `svelte-kit package` errors when lib directory does not exist ([#3562](https://github.com/sveltejs/kit/pull/3562))
- chore: refactor AMP validation ([#3554](https://github.com/sveltejs/kit/pull/3554))

## 1.0.0-next.245

### Patch Changes

- Allow adapters to pass in `platform` object ([#3429](https://github.com/sveltejs/kit/pull/3429))
- favicon.ico is now requestable ([#3559](https://github.com/sveltejs/kit/pull/3559))

## 1.0.0-next.244

### Patch Changes

- fix: reading from same response body twice during prerender (#3473) ([#3521](https://github.com/sveltejs/kit/pull/3521))
- Add CSP support ([#3499](https://github.com/sveltejs/kit/pull/3499))
- chore: remove InternalHandle ([#3541](https://github.com/sveltejs/kit/pull/3541))
- Force Vite to use HTTP/1 in dev mode, so `dev --https` works again ([#3553](https://github.com/sveltejs/kit/pull/3553))

## 1.0.0-next.243

### Patch Changes

- fix: hydrate real HTTP requests ([#3547](https://github.com/sveltejs/kit/pull/3547))

## 1.0.0-next.242

### Patch Changes

- reinstate `EndpointOutput` generic ([#3537](https://github.com/sveltejs/kit/pull/3537))

## 1.0.0-next.241

### Patch Changes

- `svelte-kit package` only encodes text files ([#3522](https://github.com/sveltejs/kit/pull/3522))

## 1.0.0-next.240

### Patch Changes

- Error if handle hook returns something other than a Response ([#3496](https://github.com/sveltejs/kit/pull/3496))
- allow setting multiple set-cookie headers ([#3502](https://github.com/sveltejs/kit/pull/3502))
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
- breaking: Expose standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object to endpoints and hooks. `method`, `headers`, and `body` now accessed through `request` field ([docs](https://kit.svelte.dev/docs/routing#endpoints), [#3384](https://github.com/sveltejs/kit/pull/3384))
- breaking: change `app.render` signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))
- breaking: move protocol/host configuration options from Kit to adapter-node ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.233

### Patch Changes

- fix: refactor navigation singletons to avoid storing undefined reference ([#3374](https://github.com/sveltejs/kit/pull/3374))
- fix: add media="(max-width: 0)" to prevent stylesheets from downloading ([#3396](https://github.com/sveltejs/kit/pull/3396))

## 1.0.0-next.232

### Patch Changes

- Preserve explicit ETag header ([#3348](https://github.com/sveltejs/kit/pull/3348))
- fix: ignore hash links during prerendering (again) ([#3367](https://github.com/sveltejs/kit/pull/3367))

## 1.0.0-next.231

### Patch Changes

- Handle requests for /basepath ([#3345](https://github.com/sveltejs/kit/pull/3345))
- Allow \_\_fetch_polyfill() to run several times ([#3357](https://github.com/sveltejs/kit/pull/3357))
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
- Preserve relevant headers when serving 304s ([#3313](https://github.com/sveltejs/kit/pull/3313))

## 1.0.0-next.227

### Patch Changes

- Adds beforeNavigate/afterNavigate lifecycle functions ([#3293](https://github.com/sveltejs/kit/pull/3293))

## 1.0.0-next.226

### Patch Changes

- Fix srcset parsing ([#3301](https://github.com/sveltejs/kit/pull/3301))
- Change ReadOnlyFormData behavior to mimic the spec's FormData interface ([#3302](https://github.com/sveltejs/kit/pull/3302))

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
- Fallthrough is now explicit and layout components now also support fallthrough ([#3217](https://github.com/sveltejs/kit/pull/3217))

## 1.0.0-next.220

### Patch Changes

- url hash is now properly reflected in page store ([#3273](https://github.com/sveltejs/kit/pull/3273))
- Strip hash fragments from URLs during prerendering ([#3251](https://github.com/sveltejs/kit/pull/3251))
- Allow prefixes and suffixes around rest parameters ([#3240](https://github.com/sveltejs/kit/pull/3240))

## 1.0.0-next.219

### Patch Changes

- Render error page if error happens in handle hook ([#3239](https://github.com/sveltejs/kit/pull/3239))
- chore: update dependency sirv to v2 ([#3263](https://github.com/sveltejs/kit/pull/3263))

## 1.0.0-next.218

### Patch Changes

- Expose appDir to adapters ([#3222](https://github.com/sveltejs/kit/pull/3222))
- Replace %svelte.assets% with relative path ([#3234](https://github.com/sveltejs/kit/pull/3234))

## 1.0.0-next.217

### Patch Changes

- Improve error message when svelte.config.js is not found ([#3219](https://github.com/sveltejs/kit/pull/3219))
- Support more text content types ([#2781](https://github.com/sveltejs/kit/pull/2781))

## 1.0.0-next.216

### Patch Changes

- make html template optional for `svelte-kit package` ([#3161](https://github.com/sveltejs/kit/pull/3161))
- Allow multiple different headers returned from one endpoint ([#3201](https://github.com/sveltejs/kit/pull/3201))

## 1.0.0-next.215

### Patch Changes

- Fix hash change focus behaviour ([#3177](https://github.com/sveltejs/kit/pull/3177))

## 1.0.0-next.214

### Patch Changes

- breaking: Add `disableScrollHandling` function (see https://kit.svelte.dev/docs/modules#$app-navigation) ([#3182](https://github.com/sveltejs/kit/pull/3182))

## 1.0.0-next.213

### Patch Changes

- Don't register service worker if there is none ([#3170](https://github.com/sveltejs/kit/pull/3170))
- Fix url pathname for prerenders ([#3178](https://github.com/sveltejs/kit/pull/3178))

## 1.0.0-next.212

### Patch Changes

- Add status and error to page store ([#3096](https://github.com/sveltejs/kit/pull/3096))
- Fix dev prebundling scanner ([#3169](https://github.com/sveltejs/kit/pull/3169))
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
- Replace config.kit.hostHeader with config.kit.headers.host, add config.kit.headers.protocol ([#2931](https://github.com/sveltejs/kit/pull/2931))
- Replace page.host with page.origin ([#2931](https://github.com/sveltejs/kit/pull/2931))
- fix: load CSS before JS preloads
- Error if adapter provides wrong input to app.render ([#3133](https://github.com/sveltejs/kit/pull/3133))
- Replace [request|page].[origin|path|query] with url object ([#3133](https://github.com/sveltejs/kit/pull/3133))

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
- fix `sveltekit:prefetch` mouse detection ([#2995](https://github.com/sveltejs/kit/pull/2995))
- Sort rest routes alphabetically ([#3093](https://github.com/sveltejs/kit/pull/3093))
- Fix invalid amp-install-serviceworker ([#3075](https://github.com/sveltejs/kit/pull/3075))

## 1.0.0-next.202

### Patch Changes

- fix: upgrade to Vite 2.7 ([#3018](https://github.com/sveltejs/kit/pull/3018))
- Allow absolute file paths given to package.dir ([#3012](https://github.com/sveltejs/kit/pull/3012))
- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.201

### Patch Changes

- Ignore mailto: and tel: links ([#2915](https://github.com/sveltejs/kit/pull/2915))

## 1.0.0-next.200

### Patch Changes

- Follow redirects when prerendering ([#2832](https://github.com/sveltejs/kit/pull/2832))
- Fix types reference in exports in package.json ([#2896](https://github.com/sveltejs/kit/pull/2896))

## 1.0.0-next.199

### Patch Changes

- fix: support etag W/ prefix ([#2709](https://github.com/sveltejs/kit/pull/2709))
- fix: revert #2819 and add code comment ([#2883](https://github.com/sveltejs/kit/pull/2883))
- Don't create empty dirs when packaging ([#2831](https://github.com/sveltejs/kit/pull/2831))
- feat: Use `event.composedPath` to find anchors for prefetching and routing ([#2769](https://github.com/sveltejs/kit/pull/2769))

## 1.0.0-next.198

### Patch Changes

- Register custom service worker for AMP ([#2265](https://github.com/sveltejs/kit/pull/2265))

## 1.0.0-next.197

### Patch Changes

- fix: prevent text unselection for keepfocus ([#2857](https://github.com/sveltejs/kit/pull/2857))
- fix: use defaults when no opts passed to router ([#2819](https://github.com/sveltejs/kit/pull/2819))

## 1.0.0-next.196

### Patch Changes

- remove all selection before navigating to the next page ([#2755](https://github.com/sveltejs/kit/pull/2755))
- fix: properly scroll if body has margin ([#2761](https://github.com/sveltejs/kit/pull/2761))

## 1.0.0-next.195

### Patch Changes

- fix: increase scroll debounce timeout ([#2749](https://github.com/sveltejs/kit/pull/2749))
- fix: do not set inlineDynamicImports ([#2753](https://github.com/sveltejs/kit/pull/2753))

## 1.0.0-next.194

### Patch Changes

- fix: correct message when serving with strict:false ([#2726](https://github.com/sveltejs/kit/pull/2726))
- fix: reset scroll when navigated from scrolled page ([#2735](https://github.com/sveltejs/kit/pull/2735))

## 1.0.0-next.193

### Patch Changes

- fix: upgrade minor deps. fetch-blob 3.1.3 needed for Netlify deploys ([#2714](https://github.com/sveltejs/kit/pull/2714))
- fix: scroll to elements provided via URL hash ([#2668](https://github.com/sveltejs/kit/pull/2668))

## 1.0.0-next.192

### Patch Changes

- fix: allow overriding inlineDynamicImports ([#2702](https://github.com/sveltejs/kit/pull/2702))

## 1.0.0-next.191

### Patch Changes

- Return the copied files from the adapter's copy\_ utils. ([#2674](https://github.com/sveltejs/kit/pull/2674))
- fix: avoid infinite loop if no routes found ([#2614](https://github.com/sveltejs/kit/pull/2614))
- security: upgrade to Vite 2.6.12, specify allow list, and print warning ([#2691](https://github.com/sveltejs/kit/pull/2691))

## 1.0.0-next.190

### Patch Changes

- fix: upgrade to Vite 2.6.11 ([#2683](https://github.com/sveltejs/kit/pull/2683))
- Return an array of written files when prerendering. ([#2675](https://github.com/sveltejs/kit/pull/2675))

## 1.0.0-next.189

### Patch Changes

- breaking: only route pages on the client-side ([#2656](https://github.com/sveltejs/kit/pull/2656))

## 1.0.0-next.188

### Patch Changes

- fix: fire navigation-end event only at end of navigation ([#2649](https://github.com/sveltejs/kit/pull/2649))
- fix: allow passing certificates via config ([#2622](https://github.com/sveltejs/kit/pull/2622))

## 1.0.0-next.187

### Patch Changes

- Fix prerendering when paths.base but not paths.assets is specified ([#2643](https://github.com/sveltejs/kit/pull/2643))

## 1.0.0-next.186

### Patch Changes

- chore: upgrade to Vite 2.6.10 ([#2634](https://github.com/sveltejs/kit/pull/2634))

## 1.0.0-next.185

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.30 ([#2626](https://github.com/sveltejs/kit/pull/2626))
- fix: allow users to override build target ([#2618](https://github.com/sveltejs/kit/pull/2618))

## 1.0.0-next.184

### Patch Changes

- breaking: drop Node 12 support ([#2604](https://github.com/sveltejs/kit/pull/2604))

## 1.0.0-next.183

### Patch Changes

- fix XSS vulnerability in `page.path` and `page.params` during SSR ([#2597](https://github.com/sveltejs/kit/pull/2597))

## 1.0.0-next.182

### Patch Changes

- fix: fixes for firing of hashchange event ([#2591](https://github.com/sveltejs/kit/pull/2591))

## 1.0.0-next.181

### Patch Changes

- fix: improve type of `init` ([#2544](https://github.com/sveltejs/kit/pull/2544))
- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))
- fix: implement support for hashchange event ([#2590](https://github.com/sveltejs/kit/pull/2590))
- chore: upgrade to Vite 2.6.7 ([#2586](https://github.com/sveltejs/kit/pull/2586))

## 1.0.0-next.180

### Patch Changes

- fix: don't expose prerender options ([#2543](https://github.com/sveltejs/kit/pull/2543))
- chore: upgrade to Vite 2.6.3" ([#2557](https://github.com/sveltejs/kit/pull/2557))
- upgrade commonjs plugin for better ignoreTryCatch default ([#2539](https://github.com/sveltejs/kit/pull/2539))

## 1.0.0-next.179

### Patch Changes

- Fix escaping of URLs of endpoint responses serialized into SSR response ([#2534](https://github.com/sveltejs/kit/pull/2534))

## 1.0.0-next.178

### Patch Changes

- fix: restore functioning of --host CLI flag with no arg ([#2525](https://github.com/sveltejs/kit/pull/2525))

## 1.0.0-next.177

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))
- fix browser-only redirect during load. ([#2462](https://github.com/sveltejs/kit/pull/2462))

## 1.0.0-next.176

### Patch Changes

- feat: allow using Vite's `strict.port: false` option ([#2507](https://github.com/sveltejs/kit/pull/2507))
- fix: allow passing in https certs again' ([#2512](https://github.com/sveltejs/kit/pull/2512))

## 1.0.0-next.175

### Patch Changes

- chore: upgrade node-fetch to 3.0.0 final ([#2422](https://github.com/sveltejs/kit/pull/2422))
- fix: don't override application focus and scroll ([#2489](https://github.com/sveltejs/kit/pull/2489))

## 1.0.0-next.174

### Patch Changes

- Fix script and style tags without attributes crashing svelte-kit package ([#2492](https://github.com/sveltejs/kit/pull/2492))

## 1.0.0-next.173

### Patch Changes

- Exports and files property in config.kit.package now accepts a function rather than an object ([#2430](https://github.com/sveltejs/kit/pull/2430))
- Renamed property exclude to files in config.kit.serviceWorker and now accepts a function instead ([#2430](https://github.com/sveltejs/kit/pull/2430))
- Remove lang tag when packaging ([#2486](https://github.com/sveltejs/kit/pull/2486))

## 1.0.0-next.172

### Patch Changes

- chore: upgrade to Svelte 3.43.0" ([#2474](https://github.com/sveltejs/kit/pull/2474))
- breaking: rename the `context` parameter of the load function to `stuff` ([#2439](https://github.com/sveltejs/kit/pull/2439))

## 1.0.0-next.171

### Patch Changes

- Fix preview when `kit.paths.base` is set. ([#2409](https://github.com/sveltejs/kit/pull/2409))
- Resolve \$lib alias when packaging ([#2453](https://github.com/sveltejs/kit/pull/2453))

## 1.0.0-next.170

### Patch Changes

- Fix prerendering/adapter-static failing when `kit.paths.base` was set. ([#2407](https://github.com/sveltejs/kit/pull/2407))

## 1.0.0-next.169

### Patch Changes

- Add "svelte" field to package.json when running package command ([#2431](https://github.com/sveltejs/kit/pull/2431))
- fix: revert #2354 and fix double character decoding a different way ([#2435](https://github.com/sveltejs/kit/pull/2435))
- feat: use the Vite server options in dev mode ([#2232](https://github.com/sveltejs/kit/pull/2232))
- update dependencies ([#2447](https://github.com/sveltejs/kit/pull/2447))

## 1.0.0-next.168

### Patch Changes

- fix: encodeURI during prerender ([#2427](https://github.com/sveltejs/kit/pull/2427))
- chore: add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.167

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.24 ([#2423](https://github.com/sveltejs/kit/pull/2423))
- Add a generic argument to allow typing Body from hooks ([#2413](https://github.com/sveltejs/kit/pull/2413))

## 1.0.0-next.166

### Patch Changes

- chore: upgrade Vite to 2.5.7
- fix: deeply-nested error components render with correct layout ([#2389](https://github.com/sveltejs/kit/pull/2389))
- Update vite-plugin-svelte to 1.0.0-next.23 ([#2402](https://github.com/sveltejs/kit/pull/2402))
- fix: pass along set-cookie headers during SSR ([#2362](https://github.com/sveltejs/kit/pull/2362))

## 1.0.0-next.165

### Patch Changes

- chore: upgrade Vite
- breaking: rename prerender.pages config option to prerender.entries ([#2380](https://github.com/sveltejs/kit/pull/2380))
- fix: anchor tag inside svg ([#2286](https://github.com/sveltejs/kit/pull/2286))

## 1.0.0-next.164

### Patch Changes

- fix: error components render with correct layout client-side as well as server-side ([#2378](https://github.com/sveltejs/kit/pull/2378))
- refactor `import.meta.env` usage in `$app/stores.js` to use `$app/env.js` to DRY code and make mocking easier ([#2353](https://github.com/sveltejs/kit/pull/2353))
- Trim `.js` extensions in package exports field ([#2345](https://github.com/sveltejs/kit/pull/2345))

## 1.0.0-next.163

### Patch Changes

- Update vite-plugin-svelte to 1.0.0-next.22 ([#2370](https://github.com/sveltejs/kit/pull/2370))
- fix: load function should not leak props to other components ([#2356](https://github.com/sveltejs/kit/pull/2356))
- packaging merge exports field by default ([#2327](https://github.com/sveltejs/kit/pull/2327))
- fix: don't decode URL when finding matching route ([#2354](https://github.com/sveltejs/kit/pull/2354))

## 1.0.0-next.162

### Patch Changes

- Enable nested dependency optimization by updating to @sveltejs/vite-plugin-svelte@1.0.0-next.21 ([#2343](https://github.com/sveltejs/kit/pull/2343))

## 1.0.0-next.161

### Patch Changes

- Allow service workers to access files using the \$lib alias ([#2326](https://github.com/sveltejs/kit/pull/2326))
- fix: remove Vite workaround now that dev deps can be bundled ([#2340](https://github.com/sveltejs/kit/pull/2340))
- support using arrays for kit.vite.resolve.alias ([#2328](https://github.com/sveltejs/kit/pull/2328))

## 1.0.0-next.160

### Patch Changes

- fix: upgrade to Vite 2.5.2 to fix URL decoding ([#2323](https://github.com/sveltejs/kit/pull/2323))
- Add `@sveltejs/kit` to `noExternal` in dev server as well ([#2332](https://github.com/sveltejs/kit/pull/2332))

## 1.0.0-next.159

### Patch Changes

- Add `@sveltejs/kit` to noExternal to resolve hooks module in dev server ([#2306](https://github.com/sveltejs/kit/pull/2306))
- fix: HMR on Windows ([#2315](https://github.com/sveltejs/kit/pull/2315))

## 1.0.0-next.158

### Patch Changes

- avoid setting rawBody/body to an empty Uint8Array when a load's fetch function is called with no body during SSR ([#2295](https://github.com/sveltejs/kit/pull/2295))

## 1.0.0-next.157

### Patch Changes

- chore: separate RequestHeaders and ResponseHeaders types ([#2248](https://github.com/sveltejs/kit/pull/2248))
- fix: don't de-indent user-rendered HTML ([#2292](https://github.com/sveltejs/kit/pull/2292))

## 1.0.0-next.156

### Patch Changes

- allow any top-level keys in svelte config ([#2267](https://github.com/sveltejs/kit/pull/2267))
- Exclude emitted declarations on packaging ([#2247](https://github.com/sveltejs/kit/pull/2247))

## 1.0.0-next.155

### Patch Changes

- chore: export App types ([#2259](https://github.com/sveltejs/kit/pull/2259))

## 1.0.0-next.154

### Patch Changes

- Upgrade to Vite 2.5.0 ([#2231](https://github.com/sveltejs/kit/pull/2231))

## 1.0.0-next.153

### Patch Changes

- rename serverFetch to externalFetch ([#2110](https://github.com/sveltejs/kit/pull/2110))

## 1.0.0-next.152

### Patch Changes

- Check ports usage in a more cross-platform way in dev server error logging ([#2209](https://github.com/sveltejs/kit/pull/2209))
- Ensure the raw body is an Uint8Array before passing it to request handlers ([#2215](https://github.com/sveltejs/kit/pull/2215))

## 1.0.0-next.151

### Patch Changes

- fix new route discovery in dev server ([#2198](https://github.com/sveltejs/kit/pull/2198))

## 1.0.0-next.150

### Patch Changes

- fix: match route against decoded path on client ([#2206](https://github.com/sveltejs/kit/pull/2206))

## 1.0.0-next.149

### Patch Changes

- export `HandleError` type ([#2200](https://github.com/sveltejs/kit/pull/2200))
- fix: match regex against route only once ([#2203](https://github.com/sveltejs/kit/pull/2203))

## 1.0.0-next.148

### Patch Changes

- update svelte peerDependency to 3.39.0 ([#2182](https://github.com/sveltejs/kit/pull/2182))
- Add hook to handle errors ([#2193](https://github.com/sveltejs/kit/pull/2193))
- Use /\_svelte_kit_assets when serving apps with specified paths.assets locally ([#2189](https://github.com/sveltejs/kit/pull/2189))
- Serve from basepath in svelte-kit dev/preview ([#2189](https://github.com/sveltejs/kit/pull/2189))
- Disallow non-absolute paths.assets option ([#2189](https://github.com/sveltejs/kit/pull/2189))
- Allow `EndpointOutput` response body objects to have a `toJSON` property ([#2170](https://github.com/sveltejs/kit/pull/2170))

## 1.0.0-next.147

### Patch Changes

- fix: handle paths consistently between dev and various production adapters ([#2171](https://github.com/sveltejs/kit/pull/2171))
- Replace function properties by methods on type declarations ([#2158](https://github.com/sveltejs/kit/pull/2158))
- fix: fallback should still be generated when prerender is disabled ([#2128](https://github.com/sveltejs/kit/pull/2128))
- update vite-plugin-svelte to 1.0.0-next.16 ([#2179](https://github.com/sveltejs/kit/pull/2179))
- Set optimizeDeps.entries to [] when building service worker ([#2180](https://github.com/sveltejs/kit/pull/2180))

## 1.0.0-next.146

### Patch Changes

- fix: enable Vite pre-bundling except for Svelte packages ([#2137](https://github.com/sveltejs/kit/pull/2137))

## 1.0.0-next.145

### Patch Changes

- feat: detect if app tries to access query with prerender enabled ([#2104](https://github.com/sveltejs/kit/pull/2104))

## 1.0.0-next.144

### Patch Changes

- 241dd623: fix: point at true dev entry point

## 1.0.0-next.143

### Patch Changes

- 8c0ffb8f: fix: provide explicit JS entry point for Vite dev mode ([#2134](https://github.com/sveltejs/kit/pull/2134))
- c3c25ee0: fix: take into account page-level options on error pages ([#2117](https://github.com/sveltejs/kit/pull/2117))

## 1.0.0-next.142

### Patch Changes

- aed1bd07: fix: fully initialize router before rendering ([#2089](https://github.com/sveltejs/kit/pull/2089))
- 970bb04c: restore reverted config changes ([#2093](https://github.com/sveltejs/kit/pull/2093))

## 1.0.0-next.141

### Patch Changes

- d109a394: fix: successfully load nested error pages ([#2076](https://github.com/sveltejs/kit/pull/2076))
- fab67c94: fix: successfully handle client errors ([#2077](https://github.com/sveltejs/kit/pull/2077))
- 943f5288: fix: solve regression parsing unicode URLs ([#2078](https://github.com/sveltejs/kit/pull/2078))
- 4435a659: fix: allow endpoint shadowing to work ([#2074](https://github.com/sveltejs/kit/pull/2074))
- ee73a265: fix: correctly do fallthrough in simple case ([#2072](https://github.com/sveltejs/kit/pull/2072))

## 1.0.0-next.140

### Patch Changes

- e55bc44a: fix: revert change to rendering options ([#2008](https://github.com/sveltejs/kit/pull/2008))
- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))
- 5911b1c7: fix: consider protocol-relative URLs as external ([#2062](https://github.com/sveltejs/kit/pull/2062))

## 1.0.0-next.139

### Patch Changes

- 883d4b85: Add public API to let adapters update .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))
- 8cbe3b05: Change `force` to `onError` in prerender config options ([#2030](https://github.com/sveltejs/kit/pull/2030))
- 1b18a844: Don't check external links on prerender ([#1679](https://github.com/sveltejs/kit/pull/1679))
- 7645399a: fix: correctly pass Vite options in preview mode ([#2036](https://github.com/sveltejs/kit/pull/2036))

## 1.0.0-next.138

### Patch Changes

- d6563169: chore: prefer interfaces to types ([#2010](https://github.com/sveltejs/kit/pull/2010))
- b18a45c1: explicitly set compilerOptions.hydratable to config.kit.hydrate ([#2024](https://github.com/sveltejs/kit/pull/2024))
- 538de3eb- feat: More powerful and configurable rendering options ([#2008](https://github.com/sveltejs/kit/pull/2008))
- 20dad18a: Remove the `prerender.force` option in favor of `prerender.onError` ([#2007](https://github.com/sveltejs/kit/pull/2007))

## 1.0.0-next.137

### Patch Changes

- bce1d76a: chore: improved typing for runtime and tests ([#1995](https://github.com/sveltejs/kit/pull/1995))
- 2a1e9795: chore: enable TypeScript strict mode ([#1998](https://github.com/sveltejs/kit/pull/1998))

## 1.0.0-next.136

### Patch Changes

- 69b92ec1: chore: improved typing on core library ([#1993](https://github.com/sveltejs/kit/pull/1993))

## 1.0.0-next.135

### Patch Changes

- 3b293f2a: update svelte to 3.40 and vite-plugin-svelte to 1.0.0-next.14 ([#1992](https://github.com/sveltejs/kit/pull/1992))
- 34b923d1: chore: stricter TypeScript checking ([#1989](https://github.com/sveltejs/kit/pull/1989))

## 1.0.0-next.134

### Patch Changes

- e1e5920a: fix: correctly find links during prerendering ([#1984](https://github.com/sveltejs/kit/pull/1984))
- c7db715e: Handle errors with incorrect type ([#1983](https://github.com/sveltejs/kit/pull/1983))

## 1.0.0-next.133

### Patch Changes

- 68190496: chore: Vite to ^2.4.3, vite-plugin-svelte to ^1.0.0-next.13 ([#1969](https://github.com/sveltejs/kit/pull/1969))
- 0cbcd7c3: fix: correctly detect external fetches ([#1980](https://github.com/sveltejs/kit/pull/1980))
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

- d279e36: Add invalidate(url) API for rerunning load functions ([#1303](https://github.com/sveltejs/kit/pull/1303))

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

- 00cbaf6: Rename `_.config.js` to `_.config.cjs` ([#356](https://github.com/sveltejs/kit/pull/356))

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
