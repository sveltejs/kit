# @sveltejs/kit

## 2.48.4
### Patch Changes


- fix: adjust query's promise implementation to properly allow chaining ([#14859](https://github.com/sveltejs/kit/pull/14859))


- fix: make prerender cache work, including in development ([#14860](https://github.com/sveltejs/kit/pull/14860))

## 2.48.3
### Patch Changes


- fix: include hash when using `resolve` with hash routing enabled ([#14786](https://github.com/sveltejs/kit/pull/14786))


- fix: `afterNavigate` callback not running after hydration when experimental async is enabled ([#14644](https://github.com/sveltejs/kit/pull/14644))
  fix: Snapshot `restore` method not called after reload when experimental async is enabled

- fix: expose `issue.path` in `.allIssues()` ([#14784](https://github.com/sveltejs/kit/pull/14784))

## 2.48.2
### Patch Changes


- fix: update DOM before running navigate callbacks ([#14829](https://github.com/sveltejs/kit/pull/14829))

## 2.48.1
### Patch Changes


- fix: wait for commit promise instead of `settled` ([#14818](https://github.com/sveltejs/kit/pull/14818))

## 2.48.0
### Minor Changes


- feat: use experimental `fork` API when available ([#14793](https://github.com/sveltejs/kit/pull/14793))


### Patch Changes


- fix: await for `settled` instead of `tick` in navigate ([#14800](https://github.com/sveltejs/kit/pull/14800))

## 2.47.3
### Patch Changes


- fix: avoid hanging when `error()` is used while streaming promises from a server `load` function ([#14722](https://github.com/sveltejs/kit/pull/14722))


- chore: treeshake load function code if we know it's unused ([#14764](https://github.com/sveltejs/kit/pull/14764))


- fix: `RecursiveFormFields` type for recursive or unknown schemas ([#14734](https://github.com/sveltejs/kit/pull/14734))


- fix: rework internal representation of form value to be `$state` ([#14771](https://github.com/sveltejs/kit/pull/14771))

## 2.47.2
### Patch Changes


- fix: streamed promise not resolving when another load function returns a fast resolving promise ([#14753](https://github.com/sveltejs/kit/pull/14753))


- chore: allow to run preflight validation only ([#14744](https://github.com/sveltejs/kit/pull/14744))


- fix: update overload to set `invalid` type to schema input ([#14748](https://github.com/sveltejs/kit/pull/14748))

## 2.47.1
### Patch Changes


- fix: allow `read` to be used at the top-level of remote function files ([#14672](https://github.com/sveltejs/kit/pull/14672))


- fix: more robust remote files generation ([#14682](https://github.com/sveltejs/kit/pull/14682))

## 2.47.0
### Minor Changes


- feat: add [`signal`](https://developer.mozilla.org/en-US/docs/Web/API/Request/signal) property to request ([#14715](https://github.com/sveltejs/kit/pull/14715))


### Patch Changes


- fix: resolve remote module syntax errors with trailing expressions ([#14728](https://github.com/sveltejs/kit/pull/14728))

## 2.46.5
### Patch Changes


- fix: ensure `form` remote functions' `fields.set` triggers reactivity ([#14661](https://github.com/sveltejs/kit/pull/14661))

## 2.46.4
### Patch Changes


- fix: prevent access of Svelte 5-only `untrack` function ([#14658](https://github.com/sveltejs/kit/pull/14658))

## 2.46.3
### Patch Changes


- fix: merge `field.set(...)` calls ([#14651](https://github.com/sveltejs/kit/pull/14651))


- fix: don't automatically reset form after an enhanced submission ([#14626](https://github.com/sveltejs/kit/pull/14626))


- fix: normalize path strings when updating field values ([#14649](https://github.com/sveltejs/kit/pull/14649))

## 2.46.2
### Patch Changes


- fix: prevent code execution order issues around SvelteKit's `env` modules ([#14637](https://github.com/sveltejs/kit/pull/14637))

## 2.46.1
### Patch Changes


- fix: use `$derived` for form fields ([#14621](https://github.com/sveltejs/kit/pull/14621))


- docs: remove `@example` blocks to allow docs to deploy ([#14636](https://github.com/sveltejs/kit/pull/14636))


- fix: require a value with `submit` and `hidden` fields ([#14635](https://github.com/sveltejs/kit/pull/14635))


- fix: delete hydration cache on effect teardown ([#14611](https://github.com/sveltejs/kit/pull/14611))

## 2.46.0
### Minor Changes


- feat: imperative form validation ([#14624](https://github.com/sveltejs/kit/pull/14624))


### Patch Changes


- fix: wait a tick before collecting form data for validation ([#14631](https://github.com/sveltejs/kit/pull/14631))


- fix: prevent code execution order issues around SvelteKit's `env` modules ([#14632](https://github.com/sveltejs/kit/pull/14632))

## 2.45.0
### Minor Changes


- feat: `form.for(id)` now implicitly sets id on form object ([#14623](https://github.com/sveltejs/kit/pull/14623))


### Patch Changes


- fix: allow `fetch` in remote function without emitting a warning ([#14610](https://github.com/sveltejs/kit/pull/14610))

## 2.44.0
### Minor Changes


- feat: expose `event.route` and `event.url` to remote functions ([#14606](https://github.com/sveltejs/kit/pull/14606))


- breaking: update experimental `form` API ([#14481](https://github.com/sveltejs/kit/pull/14481))


### Patch Changes


- fix: don't crawl error responses during prerendering ([#14596](https://github.com/sveltejs/kit/pull/14596))

## 2.43.8
### Patch Changes


- fix: HMR for `query` ([#14587](https://github.com/sveltejs/kit/pull/14587))


- fix: avoid client modules while traversing dependencies to prevent FOUC during dev ([#14577](https://github.com/sveltejs/kit/pull/14577))


- fix: skip prebundling of .remote.js files ([#14583](https://github.com/sveltejs/kit/pull/14583))


- fix: more robust remote file pattern matching ([#14578](https://github.com/sveltejs/kit/pull/14578))

## 2.43.7
### Patch Changes


- fix: correctly type the `result` of `form` remote functions that do not accept data ([#14573](https://github.com/sveltejs/kit/pull/14573))


- fix: force remote module chunks to isolate themselves ([#14571](https://github.com/sveltejs/kit/pull/14571))

## 2.43.6
### Patch Changes


- fix: ensure cache key is consistent between client/server ([#14563](https://github.com/sveltejs/kit/pull/14563))


- fix: keep resolve relative to initial base during prerender ([#14533](https://github.com/sveltejs/kit/pull/14533))


- fix: avoid including `HEAD` twice when an unhandled HTTP method is used in a request to a `+server` handler that has both a `GET` handler and a `HEAD` handler ([#14564](https://github.com/sveltejs/kit/pull/14564))


- fix: smoothscroll to deep link ([#14569](https://github.com/sveltejs/kit/pull/14569))

## 2.43.5
### Patch Changes


- fix: fall back to non-relative resolution when calling `resolve(...)` outside an event context ([#14532](https://github.com/sveltejs/kit/pull/14532))

## 2.43.4
### Patch Changes


- fix: Webcontainer AsyncLocalStorage workaround ([#14526](https://github.com/sveltejs/kit/pull/14526))

## 2.43.3
### Patch Changes


- fix: Webcontainer AsyncLocalStorage workaround ([#14521](https://github.com/sveltejs/kit/pull/14521))


- fix: include the value of form submitters on `form` remote functions ([#14475](https://github.com/sveltejs/kit/pull/14475))

## 2.43.2
### Patch Changes


- fix: ensure rendering starts off synchronously ([#14517](https://github.com/sveltejs/kit/pull/14517))


- fix: keep serialized remote data alive until navigation ([#14508](https://github.com/sveltejs/kit/pull/14508))

## 2.43.1
### Patch Changes


- fix: consistently use bare import for internals ([#14506](https://github.com/sveltejs/kit/pull/14506))

## 2.43.0
### Minor Changes


- feat: experimental async SSR ([#14447](https://github.com/sveltejs/kit/pull/14447))


### Patch Changes


- fix: ensure `__SVELTEKIT_PAYLOAD__.data` is accessed safely ([#14491](https://github.com/sveltejs/kit/pull/14491))


- fix: create separate cache entries for non-exported remote function queries ([#14499](https://github.com/sveltejs/kit/pull/14499))

## 2.42.2
### Patch Changes


- fix: prevent loops in postbuild analysis phase ([#14450](https://github.com/sveltejs/kit/pull/14450))


- fix: handle nested object fields in form data ([#14469](https://github.com/sveltejs/kit/pull/14469))


- fix: robustify form helper types ([#14463](https://github.com/sveltejs/kit/pull/14463))


- fix: avoid running the `init` hook during builds if there's nothing to prerender ([#14464](https://github.com/sveltejs/kit/pull/14464))


- fix: ensure SSR rendering gets request store context ([#14476](https://github.com/sveltejs/kit/pull/14476))

## 2.42.1
### Patch Changes


- fix: ensure environment setup is in its own chunk ([#14441](https://github.com/sveltejs/kit/pull/14441))

## 2.42.0
### Minor Changes


- feat: enhance remote form functions with schema support, `input` and `issues` properties ([#14383](https://github.com/sveltejs/kit/pull/14383))


- breaking: remote form functions get passed a parsed POJO instead of a `FormData` object now ([#14383](https://github.com/sveltejs/kit/pull/14383))

## 2.41.0
### Minor Changes


- feat: add `%sveltekit.version%` to `app.html` ([#12132](https://github.com/sveltejs/kit/pull/12132))


### Patch Changes


- fix: allow remote functions to return custom types serialized with `transport` hooks ([#14435](https://github.com/sveltejs/kit/pull/14435))


- fix: fulfil `beforeNavigate` `complete` when redirected ([#12896](https://github.com/sveltejs/kit/pull/12896))

## 2.40.0
### Minor Changes


- feat: include `event` property on popstate/link/form navigation ([#14307](https://github.com/sveltejs/kit/pull/14307))


### Patch Changes


- fix: respect `replaceState`/`keepFocus`/`noScroll` when a navigation results in a redirect ([#14424](https://github.com/sveltejs/kit/pull/14424))


- fix: invalidate preload cache when invalidateAll is true ([#14420](https://github.com/sveltejs/kit/pull/14420))

## 2.39.1
### Patch Changes


- fix: more robust remote function code transformation ([#14418](https://github.com/sveltejs/kit/pull/14418))

## 2.39.0
### Minor Changes


- feat: lazy discovery of remote functions ([#14293](https://github.com/sveltejs/kit/pull/14293))


### Patch Changes


- fix: layout load data not serialized on error page ([#14395](https://github.com/sveltejs/kit/pull/14395))


- fix: fail prerendering when remote function fails ([#14365](https://github.com/sveltejs/kit/pull/14365))


- fix: treat handle hook redirect as part of remote function call as json redirect ([#14362](https://github.com/sveltejs/kit/pull/14362))

## 2.38.1
### Patch Changes


- fix: enable redirects from queries ([#14400](https://github.com/sveltejs/kit/pull/14400))


- fix: remove empty nodes from serialized server load data ([#14404](https://github.com/sveltejs/kit/pull/14404))


- fix: allow commands from within endpoints ([#14343](https://github.com/sveltejs/kit/pull/14343))

## 2.38.0
### Minor Changes


- feat: add new remote function `query.batch` ([#14272](https://github.com/sveltejs/kit/pull/14272))

## 2.37.1
### Patch Changes


- fix: serialize server `load` data before passing to universal `load`, to handle mutations and promises ([#14298](https://github.com/sveltejs/kit/pull/14298))


- fix: resolve_route prevent dropping a trailing slash of id ([#14294](https://github.com/sveltejs/kit/pull/14294))


- fix: assign correct status code to form submission error on the client ([#14345](https://github.com/sveltejs/kit/pull/14345))


- fix: un-proxy `form.result` ([#14346](https://github.com/sveltejs/kit/pull/14346))

## 2.37.0
### Minor Changes


- feat: automatically resolve `query.refresh()` promises on the server ([#14332](https://github.com/sveltejs/kit/pull/14332))


- feat: allow query.set() to be called on the server ([#14304](https://github.com/sveltejs/kit/pull/14304))


### Patch Changes


- fix: disable CSRF checks in dev ([#14335](https://github.com/sveltejs/kit/pull/14335))


- fix: allow redirects to external URLs from within form functions ([#14329](https://github.com/sveltejs/kit/pull/14329))


- fix: add type definitions for `query.set()` method to override the value of a remote query function ([#14303](https://github.com/sveltejs/kit/pull/14303))


- fix: ensure uniqueness of `form.for(...)` across form functions ([#14327](https://github.com/sveltejs/kit/pull/14327))

## 2.36.3
### Patch Changes


- fix: bump devalue ([#14323](https://github.com/sveltejs/kit/pull/14323))


- chore: consolidate dev checks to use `esm-env` instead of a `__SVELTEKIT_DEV__` global ([#14308](https://github.com/sveltejs/kit/pull/14308))


- fix: reset form inputs by default when using remote form functions ([#14322](https://github.com/sveltejs/kit/pull/14322))

## 2.36.2
### Patch Changes


- chore: make config deprecation warnings more visible ([#14281](https://github.com/sveltejs/kit/pull/14281))


- chore: remove redundant Not Found error message ([#14289](https://github.com/sveltejs/kit/pull/14289))


- chore: deprecate `csrf.checkOrigin` in favour of `csrf.trustedOrigins: ['*']` ([#14281](https://github.com/sveltejs/kit/pull/14281))

## 2.36.1
### Patch Changes


- fix: ensure importing from `$app/navigation` works in test files ([#14195](https://github.com/sveltejs/kit/pull/14195))

## 2.36.0
### Minor Changes


- feat: add `csrf.trustedOrigins` configuration ([#14021](https://github.com/sveltejs/kit/pull/14021))


### Patch Changes


- fix: correctly decode custom types streamed from a server load function ([#14261](https://github.com/sveltejs/kit/pull/14261))


- fix: add trailing slash pathname when generating typed routes ([#14065](https://github.com/sveltejs/kit/pull/14065))

## 2.35.0
### Minor Changes


- feat: better server-side error logging ([#13990](https://github.com/sveltejs/kit/pull/13990))


### Patch Changes


- fix: ensure static error page is loaded correctly for custom user errors ([#13952](https://github.com/sveltejs/kit/pull/13952))

## 2.34.1
### Patch Changes


- fix: support multiple cookies with the same name across different paths and domains ([`b2c5d02`](https://github.com/sveltejs/kit/commit/b2c5d02994a6d83275d6fb3645e6f9a2518c8d20))


- fix: add link header when preloading font ([#14200](https://github.com/sveltejs/kit/pull/14200))


- fix: `cookies.get(...)` returns `undefined` for a just-deleted cookie ([`b2c5d02`](https://github.com/sveltejs/kit/commit/b2c5d02994a6d83275d6fb3645e6f9a2518c8d20))


- fix: load env before prerender ([`c5f7139`](https://github.com/sveltejs/kit/commit/c5f713951e41af2000f21929d42eb9d30c9d3a5c))

## 2.34.0
### Minor Changes


- feat: allow dynamic `env` access during prerender ([#14243](https://github.com/sveltejs/kit/pull/14243))


### Patch Changes


- fix: clone `fetch` responses so that headers are mutable ([#13942](https://github.com/sveltejs/kit/pull/13942))


- fix: serialize server `load` data before passing to universal `load`, to handle mutations ([#14268](https://github.com/sveltejs/kit/pull/14268))


- fix: allow `asset(...)` to be used with imported assets ([#14270](https://github.com/sveltejs/kit/pull/14270))

## 2.33.1
### Patch Changes


- fix: make paths in .css assets relative ([#14262](https://github.com/sveltejs/kit/pull/14262))


- fix: avoid copying SSR stylesheets to client assets ([#13069](https://github.com/sveltejs/kit/pull/13069))

## 2.33.0
### Minor Changes


- feat: configure error reporting when routes marked as prerendable were not prerendered ([#11702](https://github.com/sveltejs/kit/pull/11702))


### Patch Changes


- fix: use correct flag for server tracing ([#14250](https://github.com/sveltejs/kit/pull/14250))


- fix: correct type names for new `handleUnseenRoutes` option ([#14254](https://github.com/sveltejs/kit/pull/14254))


- chore: Better docs and error message for missing `@opentelemetry/api` dependency ([#14250](https://github.com/sveltejs/kit/pull/14250))

## 2.32.0
### Minor Changes


- feat: inline load fetch `response.body` stream data as base64 in page ([#11473](https://github.com/sveltejs/kit/pull/11473))


### Patch Changes


- fix: better error when `.remote.ts` files are used without the `experimental.remoteFunctions` flag ([#14225](https://github.com/sveltejs/kit/pull/14225))

## 2.31.1
### Patch Changes


- fix: pass options to resolve in resolveId hook ([#14223](https://github.com/sveltejs/kit/pull/14223))

## 2.31.0
### Minor Changes


- feat: OpenTelemetry tracing for `handle`, `sequence`, form actions, remote functions, and `load` functions running on the server ([#13899](https://github.com/sveltejs/kit/pull/13899))


- feat: add `instrumentation.server.ts` for tracing and observability setup ([#13899](https://github.com/sveltejs/kit/pull/13899))

## 2.30.1
### Patch Changes


- chore: generate `$app/types` in a more Typescript-friendly way ([#14207](https://github.com/sveltejs/kit/pull/14207))

## 2.30.0
### Minor Changes


- feat: allow to specify options for the service worker in `svelte.config.js` ([#13578](https://github.com/sveltejs/kit/pull/13578))


### Patch Changes


- fix: ensure buttonProps.enhance works on buttons with nested text ([#14199](https://github.com/sveltejs/kit/pull/14199))


- fix: pass validation issues specifically to avoid non-enumerable spreading error ([#14197](https://github.com/sveltejs/kit/pull/14197))

## 2.29.1
### Patch Changes


- chore: allow remote functions in all of the src directory ([#14198](https://github.com/sveltejs/kit/pull/14198))

## 2.29.0
### Minor Changes


- feat: add a `kit.files.src` option ([#14152](https://github.com/sveltejs/kit/pull/14152))


### Patch Changes


- fix: don't treat `$lib/server.ts` or `$lib/server_whatever.ts` as server-only modules, only `$lib/server/**` ([#14191](https://github.com/sveltejs/kit/pull/14191))


- fix: make illegal server-only import errors actually useful ([#14155](https://github.com/sveltejs/kit/pull/14155))


- chore: deprecate `config.kit.files` options ([#14152](https://github.com/sveltejs/kit/pull/14152))


- fix: avoid warning if page options in a Svelte file belongs to a comment ([#14180](https://github.com/sveltejs/kit/pull/14180))

## 2.28.0
### Minor Changes


- feat: add `RouteId` and `RouteParams` to NavigationTarget interface ([#14167](https://github.com/sveltejs/kit/pull/14167))


- feat: add `pending` property to forms and commands ([#14137](https://github.com/sveltejs/kit/pull/14137))


### Patch Changes


- fix: `fetch` imported assets during prerender ([#12201](https://github.com/sveltejs/kit/pull/12201))


- chore: refactor redundant base64 encoding/decoding functions ([#14160](https://github.com/sveltejs/kit/pull/14160))


- fix: use correct cache result when fetching same url multiple times ([#12355](https://github.com/sveltejs/kit/pull/12355))


- fix: don't refresh queries automatically when running commands ([#14170](https://github.com/sveltejs/kit/pull/14170))


- fix: avoid writing remote function bundle to disk when treeshaking prerendered queries ([#14161](https://github.com/sveltejs/kit/pull/14161))

## 2.27.3
### Patch Changes


- chore: add `.git` to the end of `package.json` repository url ([#14134](https://github.com/sveltejs/kit/pull/14134))

## 2.27.2
### Patch Changes


- fix: ensure `form()` remote functions work when the app is configured to a single output ([#14127](https://github.com/sveltejs/kit/pull/14127))


- fix: use the configured base path when calling remote functions from the client ([#14106](https://github.com/sveltejs/kit/pull/14106))

## 2.27.1
### Patch Changes


- fix: correctly type remote function input parameters from a schema ([#14098](https://github.com/sveltejs/kit/pull/14098))


- fix: match URL-encoded newlines in rest route params ([#14102](https://github.com/sveltejs/kit/pull/14102))


- fix: correctly spell server-side in error messages ([#14101](https://github.com/sveltejs/kit/pull/14101))

## 2.27.0
### Minor Changes


- feat: remote functions ([#13986](https://github.com/sveltejs/kit/pull/13986))

## 2.26.1
### Patch Changes


- fix: posixify internal app server path ([#14049](https://github.com/sveltejs/kit/pull/14049))


- fix: ignore route groups when generating typed routes ([#14050](https://github.com/sveltejs/kit/pull/14050))

## 2.26.0
### Minor Changes


- feat: better type-safety for `page.route.id`, `page.params`, `page.url.pathname` and various other places ([#13864](https://github.com/sveltejs/kit/pull/13864))


- feat: `resolve(...)` and `asset(...)` helpers for resolving paths ([#13864](https://github.com/sveltejs/kit/pull/13864))


- feat: Add `$app/types` module with `Asset`, `RouteId`, `Pathname`, `ResolvedPathname` `RouteParams<T>` and `LayoutParams<T>` ([#13864](https://github.com/sveltejs/kit/pull/13864))

## 2.25.2
### Patch Changes


- fix: correctly set URL when navigating during an ongoing navigation ([#14004](https://github.com/sveltejs/kit/pull/14004))

## 2.25.1
### Patch Changes


- fix: add missing params property ([#14012](https://github.com/sveltejs/kit/pull/14012))

## 2.25.0
### Minor Changes


- feat: support asynchronous `read` implementations from adapters ([#13859](https://github.com/sveltejs/kit/pull/13859))


### Patch Changes


- fix: log when no Svelte config file has been found to avoid confusion ([#14001](https://github.com/sveltejs/kit/pull/14001))

## 2.24.0
### Minor Changes


- feat: typed `params` prop for page/layout components ([#13999](https://github.com/sveltejs/kit/pull/13999))


### Patch Changes


- fix: treeshake internal `storage.get` helper ([#13998](https://github.com/sveltejs/kit/pull/13998))

## 2.23.0
### Minor Changes


- feat: support svelte.config.ts ([#13935](https://github.com/sveltejs/kit/pull/13935))
  
  > **NOTE**
  >
  > Your runtime has to support importing TypeScript files for `svelte.config.ts` to work.
  > In Node.js, the feature is supported with the `--experimental-strip-types` flag starting in Node 22.6.0 and supported without a flag starting in Node 23.6.0.

### Patch Changes


- fix: extend `vite-plugin-svelte`'s `Config` type instead of duplicating it ([#13982](https://github.com/sveltejs/kit/pull/13982))


- fix: regression with `rolldown-vite` not bundling a single JS file for single and inline apps ([#13941](https://github.com/sveltejs/kit/pull/13941))

## 2.22.5
### Patch Changes


- fix: re-add `@sveltejs/kit` to `optimizeDeps.exclude` ([#13983](https://github.com/sveltejs/kit/pull/13983))

## 2.22.4
### Patch Changes


- fix: force `$app/*` modules to be bundled ([#13977](https://github.com/sveltejs/kit/pull/13977))

## 2.22.3
### Patch Changes


- fix: don't bundle `@sveltejs/kit` ([#13971](https://github.com/sveltejs/kit/pull/13971))

## 2.22.2
### Patch Changes


- fix: use fallback if `untrack` doesn't exist in svelte package ([#13933](https://github.com/sveltejs/kit/pull/13933))


- fix: warning for chrome devtools requests now suggests sv instead of vite plugin ([#13905](https://github.com/sveltejs/kit/pull/13905))

## 2.22.1
### Patch Changes


- fix: prevent infinite loop when calling `pushState`/`replaceState` in `$effect` ([#13914](https://github.com/sveltejs/kit/pull/13914))


- chore: use `manualChunks` to bundle single and inline apps with Rolldown ([#13915](https://github.com/sveltejs/kit/pull/13915))

## 2.22.0
### Minor Changes


- feat: add support for Vite 7 and Rolldown. See https://vite.dev/guide/rolldown.html#how-to-try-rolldown for details about how to try experimental Rolldown support. You will also need `vite-plugin-svelte@^6.0.0-next.0` and `vite@^7.0.0-beta.0`. Compilation should be faster using Rolldown, but with larger bundle sizes until additional tree-shaking is implemented in Rolldown. See [#13738](https://github.com/sveltejs/kit/issues/13738) for ongoing work. ([#13747](https://github.com/sveltejs/kit/pull/13747))

## 2.21.5
### Patch Changes


- fix: correctly set the sequential focus navigation point when using hash routing ([#13884](https://github.com/sveltejs/kit/pull/13884))


- fix: regression when resetting focus and the URL hash contains selector combinators or separators ([#13884](https://github.com/sveltejs/kit/pull/13884))

## 2.21.4
### Patch Changes


- fix: correctly access transport decoders on the client when building for a single or inline output app ([#13871](https://github.com/sveltejs/kit/pull/13871))

## 2.21.3
### Patch Changes


- fix: correctly invalidate static analysis cache of child nodes when modifying a universal `+layout` file during dev ([#13793](https://github.com/sveltejs/kit/pull/13793))


- fix: correctly set sequential focus navigation starting point after navigation ([#10856](https://github.com/sveltejs/kit/pull/10856))


- fix: suppress console spam for chrome devtools requests ([#13830](https://github.com/sveltejs/kit/pull/13830))


- fix: avoid externalising packages that depend on `@sveltejs/kit` so that libraries can also use `redirect` and `error` helpers ([#13843](https://github.com/sveltejs/kit/pull/13843))


- fix: correctly run `deserialize` on the server ([#13686](https://github.com/sveltejs/kit/pull/13686))


- fix: correctly inline stylesheets of components dynamically imported in a universal load function if they are below the configured inlineStyleThreshold ([#13723](https://github.com/sveltejs/kit/pull/13723))

## 2.21.2
### Patch Changes


- fix: omit stack when logging 404 errors ([#13848](https://github.com/sveltejs/kit/pull/13848))

## 2.21.1
### Patch Changes


- chore: clarify which functions `handleFetch` affects ([#13788](https://github.com/sveltejs/kit/pull/13788))


- fix: ensure `$env` and `$app/environment` are correctly set while analysing server nodes ([#13790](https://github.com/sveltejs/kit/pull/13790))

## 2.21.0
### Minor Changes


- feat: allow running client-side code at the top-level of universal pages/layouts when SSR is disabled and page options are only boolean or string literals ([#13684](https://github.com/sveltejs/kit/pull/13684))


### Patch Changes


- chore: remove `import-meta-resolve` dependency ([#13629](https://github.com/sveltejs/kit/pull/13629))


- fix: remove component code from server nodes that are never used for SSR ([#13684](https://github.com/sveltejs/kit/pull/13684))

## 2.20.8
### Patch Changes


- fix: ensure that `ssr` and `csr` page options apply to error pages rendered as a result of a load function error on the server ([#13695](https://github.com/sveltejs/kit/pull/13695))

## 2.20.7
### Patch Changes


- fix: regression when serializing server data ([#13709](https://github.com/sveltejs/kit/pull/13709))

## 2.20.6
### Patch Changes


- fix: escape names of tracked search parameters ([`d3300c6a67908590266c363dba7b0835d9a194cf`](https://github.com/sveltejs/kit/commit/d3300c6a67908590266c363dba7b0835d9a194cf))

## 2.20.5
### Patch Changes


- allow `HandleServerError` hook to access `getRequestEvent` ([#13666](https://github.com/sveltejs/kit/pull/13666))


- fix: prevent Rollup warnings for undefined hooks ([#13687](https://github.com/sveltejs/kit/pull/13687))

## 2.20.4
### Patch Changes


- chore: remove internal class-replacement hack that isn't needed anymore ([#13664](https://github.com/sveltejs/kit/pull/13664))

## 2.20.3
### Patch Changes


- fix: only call `afterNavigate` once on app start when SSR is disabled ([#13593](https://github.com/sveltejs/kit/pull/13593))

## 2.20.2
### Patch Changes


- fix: allow non-prerendered API endpoint calls during reroute when prerendering ([#13616](https://github.com/sveltejs/kit/pull/13616))

## 2.20.1
### Patch Changes


- fix: avoid using top-level await ([#13607](https://github.com/sveltejs/kit/pull/13607))

## 2.20.0
### Minor Changes


- feat: add `getRequestEvent` to `$app/server` ([#13582](https://github.com/sveltejs/kit/pull/13582))

## 2.19.2
### Patch Changes


- fix: lazily load CSS for dynamically imported components ([#13564](https://github.com/sveltejs/kit/pull/13564))

## 2.19.1
### Patch Changes


- fix: allow reroute to point to prerendered route ([#13575](https://github.com/sveltejs/kit/pull/13575))

## 2.19.0
### Minor Changes


- feat: provide `fetch` to `reroute` ([#13549](https://github.com/sveltejs/kit/pull/13549))


### Patch Changes


- chore: cache reroute results ([#13548](https://github.com/sveltejs/kit/pull/13548))

## 2.18.0
### Minor Changes


- feat: allow async `reroute` ([#13520](https://github.com/sveltejs/kit/pull/13520))


- feat: provide `normalizeUrl` helper ([#13539](https://github.com/sveltejs/kit/pull/13539))


### Patch Changes


- fix: correct navigation history with hash router and ensure load functions are rerun on user changes to URL hash ([#13492](https://github.com/sveltejs/kit/pull/13492))


- fix: include universal load assets as server assets ([#13531](https://github.com/sveltejs/kit/pull/13531))


- fix: Include root layout and error nodes even when apps have only prerendered pages ([#13522](https://github.com/sveltejs/kit/pull/13522))


- fix: correctly preload data on `mousedown`/`touchstart` if code was preloaded on hover ([#13530](https://github.com/sveltejs/kit/pull/13530))

## 2.17.3
### Patch Changes


- fix: avoid simulated CORS errors with non-HTTP URLs ([#13493](https://github.com/sveltejs/kit/pull/13493))


- fix: correctly preload links on `mousedown`/`touchstart` ([#13486](https://github.com/sveltejs/kit/pull/13486))


- fix: load CSS when using server-side route resolution ([#13498](https://github.com/sveltejs/kit/pull/13498))


- fix: correctly find shared entry-point CSS files during inlining ([#13431](https://github.com/sveltejs/kit/pull/13431))

## 2.17.2
### Patch Changes


- fix: add promise return type to the `enhance` action callback ([#13420](https://github.com/sveltejs/kit/pull/13420))


- fix: change server-side route resolution endpoint ([#13461](https://github.com/sveltejs/kit/pull/13461))

## 2.17.1
### Patch Changes


- fix: make route resolution imports root-relative if `paths.relative` option is `false` ([#13412](https://github.com/sveltejs/kit/pull/13412))

## 2.17.0
### Minor Changes


- feat: validate values for `cache-control` and `content-type` headers in dev mode ([#13114](https://github.com/sveltejs/kit/pull/13114))


- feat: support server-side route resolution ([#13379](https://github.com/sveltejs/kit/pull/13379))


### Patch Changes


- chore: don't error during development when using `use:enhance` with `+server` as some third party libraries make it possible to POST forms to it ([#13397](https://github.com/sveltejs/kit/pull/13397))


- fix: skip hooks for server fetch to prerendered routes ([#13377](https://github.com/sveltejs/kit/pull/13377))


- fix: ignore non-entry-point CSS files during inlining ([#13395](https://github.com/sveltejs/kit/pull/13395))


- fix: default server fetch to use prerendered paths ([#13377](https://github.com/sveltejs/kit/pull/13377))

## 2.16.1
### Patch Changes


- fix: avoid overwriting headers for sub-requests made while loading the error page ([#13341](https://github.com/sveltejs/kit/pull/13341))


- fix: correctly resolve index file entrypoints such as `src/service-worker/index.js` ([#13354](https://github.com/sveltejs/kit/pull/13354))


- fix: correctly handle relative anchors when using the hash router ([#13356](https://github.com/sveltejs/kit/pull/13356))

## 2.16.0
### Minor Changes


- feat: add ability to invalidate a custom identifier on `goto()` ([#13256](https://github.com/sveltejs/kit/pull/13256))


- feat: remove the `postinstall` script to support pnpm 10 ([#13304](https://github.com/sveltejs/kit/pull/13304))
  
  NOTE: users should add `"prepare": "svelte-kit sync`" to their `package.json` in order to avoid the following warning upon first running Vite:
  ```
  ▲ [WARNING] Cannot find base config file "./.svelte-kit/tsconfig.json" [tsconfig.json]
  
      tsconfig.json:2:12:
        2 │   "extends": "./.svelte-kit/tsconfig.json",
          ╵              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ```

- feat: provide `PageProps` and `LayoutProps` types ([#13308](https://github.com/sveltejs/kit/pull/13308))


### Patch Changes


- perf: shorten chunk file names ([#13003](https://github.com/sveltejs/kit/pull/13003))


- fix: strip internal data before passing URL to `reroute` ([#13092](https://github.com/sveltejs/kit/pull/13092))


- fix: support absolute URLs and reroutes with `data-sveltekit-preload-code="viewport"` ([#12217](https://github.com/sveltejs/kit/pull/12217))


- fix: use current `window.fetch` for server load fetch requests ([#13315](https://github.com/sveltejs/kit/pull/13315))


- fix: resolve symlinks when handling routes ([#12740](https://github.com/sveltejs/kit/pull/12740))


- fix: prevent infinite reload when using the hash router and previewing `/index.html` ([#13296](https://github.com/sveltejs/kit/pull/13296))


- fix: service worker base path in dev mode ([#12577](https://github.com/sveltejs/kit/pull/12577))


- chore: error during development when using `use:enhance` with `+server` ([#13197](https://github.com/sveltejs/kit/pull/13197))


- chore: add most common status codes to `redirect()` JS documentation ([#13301](https://github.com/sveltejs/kit/pull/13301))


- fix: correctly link to assets inlined by the `inlineStyleThreshold` option ([#13068](https://github.com/sveltejs/kit/pull/13068))


- fix: fall back to importing dynamic dependencies relative to SvelteKit package ([#12532](https://github.com/sveltejs/kit/pull/12532))


- fix: use arrow function types over bound funcs ([#12955](https://github.com/sveltejs/kit/pull/12955))


- fix: correctly navigate when hash router is enabled and the browser encodes extra hashes ([#13321](https://github.com/sveltejs/kit/pull/13321))

## 2.15.3
### Patch Changes


- fix: fix race-condition when not using SSR when pressing back before initial load ([#12925](https://github.com/sveltejs/kit/pull/12925))


- fix: remove ":$" from virtual module ids to allow dev server to work with proxies ([#12157](https://github.com/sveltejs/kit/pull/12157))


- fix: upgrade esm-env to remove warning when NODE_ENV is not set ([#13291](https://github.com/sveltejs/kit/pull/13291))


- fix: handle `Redirect` thrown from root layout load function when client-side navigating to a non-existent page ([#12005](https://github.com/sveltejs/kit/pull/12005))


- fix: make param matchers generated type import end with `.js` ([#13286](https://github.com/sveltejs/kit/pull/13286))

## 2.15.2
### Patch Changes


- fix: correctly notify page store subscribers ([#13205](https://github.com/sveltejs/kit/pull/13205))


- fix: prerender data when there is no server load but the `trailingSlash` option is set from the server ([#13262](https://github.com/sveltejs/kit/pull/13262))


- fix: correctly remove navigation callbacks when returning function in onNavigate ([#13241](https://github.com/sveltejs/kit/pull/13241))

## 2.15.1
### Patch Changes


- fix: add CSP hashes/nonces to inline styles when using `bundleStrategy: 'inline'` ([#13232](https://github.com/sveltejs/kit/pull/13232))


- fix: silence dev/prod warning during sync ([#13244](https://github.com/sveltejs/kit/pull/13244))

## 2.15.0
### Minor Changes


- feat: add `bundleStrategy: 'inline'` option ([#13193](https://github.com/sveltejs/kit/pull/13193))

## 2.14.1
### Patch Changes


- fix: do not mutate URL during reroute logic ([#13222](https://github.com/sveltejs/kit/pull/13222))

## 2.14.0
### Minor Changes


- feat: add hash-based routing option ([#13191](https://github.com/sveltejs/kit/pull/13191))


### Patch Changes


- fix: create new URL when calling `goto(...)`, to handle case where URL is mutated ([#13196](https://github.com/sveltejs/kit/pull/13196))

## 2.13.0
### Minor Changes


- feat: add `bundleStrategy: 'split' | 'single'` option ([#13173](https://github.com/sveltejs/kit/pull/13173))

## 2.12.2
### Patch Changes


- fix: correctly resolve no hooks file when a similarly named directory exists ([#13188](https://github.com/sveltejs/kit/pull/13188))


- fix: correctly resolve `$app/state` on the server with Vite 5 ([#13192](https://github.com/sveltejs/kit/pull/13192))

## 2.12.1
### Patch Changes


- fix: replace `navigating.current.<x>` with `navigating.<x>` ([#13174](https://github.com/sveltejs/kit/pull/13174))

## 2.12.0
### Minor Changes


- feat: add `$app/state` module ([#13140](https://github.com/sveltejs/kit/pull/13140))


### Patch Changes


- chore: specify the route ID in the error message during development when making a form action request to a route without form actions ([#13167](https://github.com/sveltejs/kit/pull/13167))

## 2.11.1
### Patch Changes


- fix: adhere to Vite `build.minify` setting when building the service worker ([#13143](https://github.com/sveltejs/kit/pull/13143))

## 2.11.0
### Minor Changes


- feat: transport custom types across the server/client boundary ([#13149](https://github.com/sveltejs/kit/pull/13149))


### Patch Changes


- fix: correctly resolve hooks file when a similarly named directory exists ([#13144](https://github.com/sveltejs/kit/pull/13144))

## 2.10.1
### Patch Changes


- fix: export `init` hook from `get_hooks` ([#13136](https://github.com/sveltejs/kit/pull/13136))

## 2.10.0
### Minor Changes


- feat: server and client `init` hook ([#13103](https://github.com/sveltejs/kit/pull/13103))


### Patch Changes


- fix: prevent hooks exported from `hooks.js` from overwriting hooks from `hooks.server.js` ([#13104](https://github.com/sveltejs/kit/pull/13104))

## 2.9.1
### Patch Changes


- fix: correctly match route groups preceding optional parameters ([#13099](https://github.com/sveltejs/kit/pull/13099))

## 2.9.0
### Minor Changes


- feat: Vite 6 support ([#12270](https://github.com/sveltejs/kit/pull/12270))


### Patch Changes


- fix: transform link[rel='shortcut icon'] and link[rel='apple-touch-icon'] to be absolute to avoid console error when navigating ([#13077](https://github.com/sveltejs/kit/pull/13077))

## 2.8.5
### Patch Changes


- fix: don't hydrate when falling back to error page ([#13056](https://github.com/sveltejs/kit/pull/13056))

## 2.8.4
### Patch Changes


- fix: update inline css url generation for FOUC prevention in dev ([#13007](https://github.com/sveltejs/kit/pull/13007))

## 2.8.3
### Patch Changes


- fix: ensure error messages are escaped ([#13050](https://github.com/sveltejs/kit/pull/13050))


- fix: escape values included in dev 404 page ([#13039](https://github.com/sveltejs/kit/pull/13039))

## 2.8.2
### Patch Changes


- fix: prevent duplicate fetch request when using Request with load function's fetch ([#13023](https://github.com/sveltejs/kit/pull/13023))


- fix: do not override default cookie decoder to allow users to override the `cookie` library version ([#13037](https://github.com/sveltejs/kit/pull/13037))

## 2.8.1
### Patch Changes


- fix: only add nonce to `script-src-elem`, `style-src-attr` and `style-src-elem` CSP directives when `unsafe-inline` is not present ([#11613](https://github.com/sveltejs/kit/pull/11613))


- fix: support HTTP/2 in dev and production. Revert the changes from [#12907](https://github.com/sveltejs/kit/pull/12907) to downgrade HTTP/2 to TLS as now being unnecessary ([#12989](https://github.com/sveltejs/kit/pull/12989))

## 2.8.0
### Minor Changes


- feat: add helper to identify `ActionFailure` objects ([#12878](https://github.com/sveltejs/kit/pull/12878))

## 2.7.7
### Patch Changes


- fix: update link in JSDoc ([#12963](https://github.com/sveltejs/kit/pull/12963))

## 2.7.6
### Patch Changes


- fix: update broken links in JSDoc ([#12960](https://github.com/sveltejs/kit/pull/12960))

## 2.7.5
### Patch Changes


- fix: warn on invalid cookie name characters ([#12806](https://github.com/sveltejs/kit/pull/12806))


- fix: when using `@vitejs/plugin-basic-ssl`, set a no-op proxy config to downgrade from HTTP/2 to TLS since `undici` does not yet enable HTTP/2 by default ([#12907](https://github.com/sveltejs/kit/pull/12907))

## 2.7.4
### Patch Changes


- fix: ensure element is focused after subsequent clicks of the same hash link ([#12866](https://github.com/sveltejs/kit/pull/12866))


- fix: avoid preload if event default was prevented for `touchstart` and `mousedown` events ([#12887](https://github.com/sveltejs/kit/pull/12887))


- fix: avoid reloading behaviour for hash links with data-sveltekit-reload if the hash is on the same page ([#12866](https://github.com/sveltejs/kit/pull/12866))

## 2.7.3
### Patch Changes


- fix: include importer in illegal import error message ([#12820](https://github.com/sveltejs/kit/pull/12820))


- fix: don't try reading assets directly that aren't present ([#12876](https://github.com/sveltejs/kit/pull/12876))


- fix: decode non-latin characters when previewing prerendered pages ([#12874](https://github.com/sveltejs/kit/pull/12874))


- fix: better error message when a `Result` is returned from a form action ([#12829](https://github.com/sveltejs/kit/pull/12829))


- docs: update URLs for new svelte.dev site ([#12857](https://github.com/sveltejs/kit/pull/12857))

## 2.7.2
### Patch Changes


- fix: use absolute links in JSDoc comments ([#12718](https://github.com/sveltejs/kit/pull/12718))

## 2.7.1
### Patch Changes


- chore: upgrade to sirv 3.0 ([#12796](https://github.com/sveltejs/kit/pull/12796))


- fix: warn when form action responses are lost because SSR is off ([#12063](https://github.com/sveltejs/kit/pull/12063))

## 2.7.0
### Minor Changes


- feat: update service worker when new version is detected ([#12448](https://github.com/sveltejs/kit/pull/12448))


### Patch Changes


- fix: correctly handle relative paths when fetching assets on the server ([#12113](https://github.com/sveltejs/kit/pull/12113))


- fix: decode non ASCII anchor hashes when scrolling into view ([#12699](https://github.com/sveltejs/kit/pull/12699))


- fix: page response missing CSP and Link headers when return promise in `load` ([#12418](https://github.com/sveltejs/kit/pull/12418))

## 2.6.4
### Patch Changes


- fix: only preload links that have a different URL than the current page ([#12773](https://github.com/sveltejs/kit/pull/12773))


- fix: revert change to replace version in generateBundle ([#12779](https://github.com/sveltejs/kit/pull/12779))


- fix: catch stack trace fixing errors thrown in web containers ([#12775](https://github.com/sveltejs/kit/pull/12775))


- fix: use absolute links in JSDoc comments ([#12772](https://github.com/sveltejs/kit/pull/12772))

## 2.6.3
### Patch Changes


- fix: ensure a changing `version` doesn't affect the hashes for chunks without any actual code changes ([#12700](https://github.com/sveltejs/kit/pull/12700))


- fix: prevent crash when logging URL search params in a server load function ([#12763](https://github.com/sveltejs/kit/pull/12763))


- chore: revert update dependency cookie to ^0.7.0 ([#12767](https://github.com/sveltejs/kit/pull/12767))

## 2.6.2
### Patch Changes


- chore(deps): update dependency cookie to ^0.7.0 ([#12746](https://github.com/sveltejs/kit/pull/12746))

## 2.6.1
### Patch Changes


- fix: better error message when calling push/replaceState before router is initialized ([#11968](https://github.com/sveltejs/kit/pull/11968))

## 2.6.0
### Minor Changes


- feat: support typed arrays in `load` functions ([#12716](https://github.com/sveltejs/kit/pull/12716))


### Patch Changes


- fix: open a new tab for `<form target="_blank">` and `<button formtarget="_blank"> submissions ([#11936](https://github.com/sveltejs/kit/pull/11936))

## 2.5.28
### Patch Changes


- fix: import `node:process` instead of using globals ([#12641](https://github.com/sveltejs/kit/pull/12641))

## 2.5.27
### Patch Changes


- fix: asynchronously instantiate components when using Svelte 5 ([#12613](https://github.com/sveltejs/kit/pull/12613))


- fix: use `{@render ...}` tag when generating default fallback page for svelte 5 apps ([#12653](https://github.com/sveltejs/kit/pull/12653))


- fix: emulate `event.platform` even when the route does not exist ([#12513](https://github.com/sveltejs/kit/pull/12513))

## 2.5.26
### Patch Changes


- fix: exclude service worker directory from tsconfig ([#12196](https://github.com/sveltejs/kit/pull/12196))

## 2.5.25
### Patch Changes


- chore: upgrade dts-buddy to 0.5.3 ([`6056ba30e29ac5747c356fbf1a42dd71f2c4aa1f`](https://github.com/sveltejs/kit/commit/6056ba30e29ac5747c356fbf1a42dd71f2c4aa1f))

## 2.5.24
### Patch Changes


- extend peer dependency range for @sveltejs/vite-plugin-svelte to include 4.0.0-next for improved svelte5 support ([#12593](https://github.com/sveltejs/kit/pull/12593))

## 2.5.23
### Patch Changes


- fix: use dynamic components in `root.svelte` instead of `svelte:component` for svelte 5 ([#12584](https://github.com/sveltejs/kit/pull/12584))

## 2.5.22
### Patch Changes


- chore: configure provenance in a simpler manner ([#12570](https://github.com/sveltejs/kit/pull/12570))

## 2.5.21
### Patch Changes


- chore: package provenance ([#12567](https://github.com/sveltejs/kit/pull/12567))

## 2.5.20
### Patch Changes


- fix: set revalidate cache header on 404'd static assets ([#12530](https://github.com/sveltejs/kit/pull/12530))

## 2.5.19
### Patch Changes


- fix: Svelte 5 - ignore `binding_non_reactive` warning in generated root component (you also need to update to `svelte@5.0.0-next.204`) ([#12524](https://github.com/sveltejs/kit/pull/12524))

## 2.5.18
### Patch Changes


- fix: respect HTML attributes `enctype` and `formenctype` for forms with `use:enhance` ([#12198](https://github.com/sveltejs/kit/pull/12198))


- fix: prevent client import error when a `hooks.server` file imports a private environment variable ([#12195](https://github.com/sveltejs/kit/pull/12195))


- fix: set default `Content-Type` header to `application/x-www-form-urlencoded` for `POST` form submissions with `use:enhance` to align with native form behaviour ([#12198](https://github.com/sveltejs/kit/pull/12198))

## 2.5.17

### Patch Changes

- chore: update package description ([#11846](https://github.com/sveltejs/kit/pull/11846))

## 2.5.16

### Patch Changes

- fix: determine local Svelte version more reliably ([#12350](https://github.com/sveltejs/kit/pull/12350))

## 2.5.15

### Patch Changes

- fix: always decode asset URLs ([#12352](https://github.com/sveltejs/kit/pull/12352))

## 2.5.14

### Patch Changes

- fix: read non-encoded data URIs ([#12347](https://github.com/sveltejs/kit/pull/12347))

## 2.5.13

### Patch Changes

- fix: decode asset URLs in dev when reading them, but for real this time ([#12344](https://github.com/sveltejs/kit/pull/12344))

## 2.5.12

### Patch Changes

- fix: decode asset URLs in dev when reading them ([#12341](https://github.com/sveltejs/kit/pull/12341))

## 2.5.11

### Patch Changes

- fix: hrefs that start with `config.prerender.origin` are now crawled ([#12277](https://github.com/sveltejs/kit/pull/12277))

- chore: add keywords for discovery in npm search ([#12330](https://github.com/sveltejs/kit/pull/12330))

- fix: handle whitespace in HTTP Accept header ([#12292](https://github.com/sveltejs/kit/pull/12292))

## 2.5.10

### Patch Changes

- fix: exclude server files from optimizeDeps.entries ([#12242](https://github.com/sveltejs/kit/pull/12242))

- fix: bump import-meta-resolve to remove deprecation warnings ([#12240](https://github.com/sveltejs/kit/pull/12240))

## 2.5.9

### Patch Changes

- fix: yield main thread before navigating ([#12225](https://github.com/sveltejs/kit/pull/12225))

- fix: correctly handle aliases to files in the `.svelte-kit` directory ([#12220](https://github.com/sveltejs/kit/pull/12220))

## 2.5.8

### Patch Changes

- fix: prevent excessive Vite dependency optimizations on navigation ([#12182](https://github.com/sveltejs/kit/pull/12182))

## 2.5.7

### Patch Changes

- chore(deps): update devalue to v5 ignore non-enumerable symbols during serialization ([#12141](https://github.com/sveltejs/kit/pull/12141))

## 2.5.6

### Patch Changes

- fix: avoid incorrectly un- and re-escaping cookies collected during a server-side `fetch` ([#11904](https://github.com/sveltejs/kit/pull/11904))

## 2.5.5

### Patch Changes

- fix: only hydrate when page is server-rendered ([#12050](https://github.com/sveltejs/kit/pull/12050))

## 2.5.4

### Patch Changes

- fix: prevent navigation when `data-sveltekit-preload-data` fails to fetch due to network error ([#11944](https://github.com/sveltejs/kit/pull/11944))

## 2.5.3

### Patch Changes

- fix: revert tsconfig change that includes svelte.config.js ([#11908](https://github.com/sveltejs/kit/pull/11908))

- fix: exclude server worker from tsconfig again ([#11727](https://github.com/sveltejs/kit/pull/11727))

## 2.5.2

### Patch Changes

- fix: tsconfig includes should cover svelte.config.js ([#11886](https://github.com/sveltejs/kit/pull/11886))

## 2.5.1

### Patch Changes

- fix: prevent stale values after invalidation ([#11870](https://github.com/sveltejs/kit/pull/11870))

- fix: prevent false positive `history.pushState` and `history.replaceState` warnings ([#11858](https://github.com/sveltejs/kit/pull/11858))

- fix: relax status code types ([#11781](https://github.com/sveltejs/kit/pull/11781))

- fix: `popstate` navigations take `pushState` navigations into account ([#11765](https://github.com/sveltejs/kit/pull/11765))

## 2.5.0

### Minor Changes

- feat: dev/preview/prerender platform emulation ([#11730](https://github.com/sveltejs/kit/pull/11730))

### Patch Changes

- fix: strip `/@fs` prefix correctly on Windows when invoking `read()` in dev mode ([#11728](https://github.com/sveltejs/kit/pull/11728))

## 2.4.3

### Patch Changes

- fix: only disallow body with GET/HEAD ([#11710](https://github.com/sveltejs/kit/pull/11710))

## 2.4.2

### Patch Changes

- fix: ignore bodies sent with non-PUT/PATCH/POST requests ([#11708](https://github.com/sveltejs/kit/pull/11708))

## 2.4.1

### Patch Changes

- fix: use Vite's default value for `build.target` and respect override supplied by user ([#11688](https://github.com/sveltejs/kit/pull/11688))

- fix: properly decode base64 strings inside `read` ([#11682](https://github.com/sveltejs/kit/pull/11682))

- fix: default route config to `{}` for feature checking ([#11685](https://github.com/sveltejs/kit/pull/11685))

- fix: handle `onNavigate` callbacks correctly ([#11678](https://github.com/sveltejs/kit/pull/11678))

## 2.4.0

### Minor Changes

- feat: add `$app/server` module with `read` function for reading assets from filesystem ([#11649](https://github.com/sveltejs/kit/pull/11649))

## 2.3.5

### Patch Changes

- fix: log a warning if fallback page overwrites prerendered page ([#11661](https://github.com/sveltejs/kit/pull/11661))

## 2.3.4

### Patch Changes

- fix: don't stash away original `history` methods so other libs can monkeypatch it ([#11657](https://github.com/sveltejs/kit/pull/11657))

## 2.3.3

### Patch Changes

- fix: remove internal `__sveltekit/` module declarations from types ([#11620](https://github.com/sveltejs/kit/pull/11620))

## 2.3.2

### Patch Changes

- fix: return plaintext 404 for anything under appDir ([#11597](https://github.com/sveltejs/kit/pull/11597))

- fix: populate dynamic public env without using top-level await, which fails in Safari ([#11601](https://github.com/sveltejs/kit/pull/11601))

## 2.3.1

### Patch Changes

- fix: amend onNavigate type ([#11599](https://github.com/sveltejs/kit/pull/11599))

- fix: better error message when peer dependency cannot be found ([#11598](https://github.com/sveltejs/kit/pull/11598))

## 2.3.0

### Minor Changes

- feat: add `reroute` hook ([#11537](https://github.com/sveltejs/kit/pull/11537))

## 2.2.2

### Patch Changes

- fix: only add nonce to `style-src` CSP directive when `unsafe-inline` is not present ([#11575](https://github.com/sveltejs/kit/pull/11575))

## 2.2.1

### Patch Changes

- feat: add CSP support for style-src-elem ([#11562](https://github.com/sveltejs/kit/pull/11562))

- fix: address CSP conflicts with sha/nonce during dev ([#11562](https://github.com/sveltejs/kit/pull/11562))

## 2.2.0

### Minor Changes

- feat: expose `$env/static/public` in service workers ([#10994](https://github.com/sveltejs/kit/pull/10994))

### Patch Changes

- fix: reload page on startup if `document.URL` contains credentials ([#11179](https://github.com/sveltejs/kit/pull/11179))

## 2.1.2

### Patch Changes

- fix: restore invalid route error message during build process ([#11559](https://github.com/sveltejs/kit/pull/11559))

## 2.1.1

### Patch Changes

- fix: respect the trailing slash option when navigating from the basepath root page ([#11388](https://github.com/sveltejs/kit/pull/11388))

- chore: shrink error messages shipped to client ([#11551](https://github.com/sveltejs/kit/pull/11551))

## 2.1.0

### Minor Changes

- feat: make client router treeshakeable ([#11340](https://github.com/sveltejs/kit/pull/11340))

### Patch Changes

- chore: reduce client bundle size ([#11547](https://github.com/sveltejs/kit/pull/11547))

## 2.0.8

### Patch Changes

- fix: always scroll to top when clicking a # or #top link ([`099608c428a49504785eab3afe3b2e76a9317bdf`](https://github.com/sveltejs/kit/commit/099608c428a49504785eab3afe3b2e76a9317bdf))

- fix: add nonce or hash to "script-src-elem", "style-src-attr" and "style-src-elem" if defined in CSP config ([#11485](https://github.com/sveltejs/kit/pull/11485))

- fix: decode server data with `stream: true` during client-side navigation ([#11409](https://github.com/sveltejs/kit/pull/11409))

- fix: capture scroll position when using `pushState` ([#11540](https://github.com/sveltejs/kit/pull/11540))

- chore: use peer dependencies when linked ([#11433](https://github.com/sveltejs/kit/pull/11433))

## 2.0.7

### Patch Changes

- chore: removed deprecated config.package type ([#11462](https://github.com/sveltejs/kit/pull/11462))

## 2.0.6

### Patch Changes

- fix: allow dynamic env access when building but not prerendering ([#11436](https://github.com/sveltejs/kit/pull/11436))

## 2.0.5

### Patch Changes

- fix: render SPA shell when SSR is turned off and there is no server data ([#11405](https://github.com/sveltejs/kit/pull/11405))

- fix: upgrade `sirv` and `mrmime` to modernize javascript mime type ([#11419](https://github.com/sveltejs/kit/pull/11419))

## 2.0.4

### Patch Changes

- chore: update primary branch from master to main ([`47779436c5f6c4d50011d0ef8b2709a07c0fec5d`](https://github.com/sveltejs/kit/commit/47779436c5f6c4d50011d0ef8b2709a07c0fec5d))

- fix: adjust missing inner content warning ([#11394](https://github.com/sveltejs/kit/pull/11394))

- fix: prevent esbuild adding phantom exports to service worker ([#11400](https://github.com/sveltejs/kit/pull/11400))

- fix: goto type include state ([#11398](https://github.com/sveltejs/kit/pull/11398))

- fix: ensure assets are served gzip in preview ([#11377](https://github.com/sveltejs/kit/pull/11377))

## 2.0.3

### Patch Changes

- fix: reinstantiate state parameter for goto ([#11342](https://github.com/sveltejs/kit/pull/11342))

## 2.0.2

### Patch Changes

- fix: prevent endless SPA 404 loop ([#11354](https://github.com/sveltejs/kit/pull/11354))

## 2.0.1

### Patch Changes

- fix: correctly handle trailing slash redirect when navigating from the root page ([#11357](https://github.com/sveltejs/kit/pull/11357))

## 2.0.0

### Major Changes

- breaking: remove top-level promise awaiting ([#11176](https://github.com/sveltejs/kit/pull/11176))

- breaking: prevent use of dynamic env vars during prerendering, serve env vars dynamically ([#11277](https://github.com/sveltejs/kit/pull/11277))

- breaking: remove deprecated `use:enhance` callback values ([#11282](https://github.com/sveltejs/kit/pull/11282))

- breaking: turn `error` and `redirect` into commands ([#11165](https://github.com/sveltejs/kit/pull/11165))

- breaking: the type for `depends` now requires a `:` as part of the string ([#11201](https://github.com/sveltejs/kit/pull/11201))

- breaking: remove baseUrl fallback from generated tsconfig ([#11294](https://github.com/sveltejs/kit/pull/11294))

- breaking: fail if route with +page and +server is marked prerenderable ([#11256](https://github.com/sveltejs/kit/pull/11256))

- breaking: remove `resolvePath` in favour of `resolveRoute` from `$app/paths` ([#11265](https://github.com/sveltejs/kit/pull/11265))

- breaking: drop support for Svelte 3 ([#11168](https://github.com/sveltejs/kit/pull/11168))

- breaking: require Vite 5.0.3+ ([#11122](https://github.com/sveltejs/kit/pull/11122))

- breaking: generate `__data.json` files as sibling to `.html` files ([#11269](https://github.com/sveltejs/kit/pull/11269))

- breaking: fail if +page and +server have mismatched config ([#11256](https://github.com/sveltejs/kit/pull/11256))

- breaking: error if form without multipart/form-data enctype contains a file input ([#11282](https://github.com/sveltejs/kit/pull/11282))

- breaking: require paths pass to preloadCode to be prefixed with basepath ([#11259](https://github.com/sveltejs/kit/pull/11259))

- breaking: `@sveltejs/vite-plugin-svelte` is now a peer dependency and will need to be installed in each project using SvelteKit ([#11184](https://github.com/sveltejs/kit/pull/11184))

- breaking: stop re-exporting vitePreprocess ([#11297](https://github.com/sveltejs/kit/pull/11297))

- breaking: require path option when setting/deleting/serializing cookies ([#11240](https://github.com/sveltejs/kit/pull/11240))

- breaking: tighten up error handling ([#11289](https://github.com/sveltejs/kit/pull/11289))

- breaking: remove state option from goto in favor of shallow routing ([#11307](https://github.com/sveltejs/kit/pull/11307))

- breaking: disallow external navigation with `goto` ([#11207](https://github.com/sveltejs/kit/pull/11207))

- breaking: upgrade to TypeScript 5. Default `moduleResolution` to `bundler` in user projects to be permissive in consuming and `NodeNext` when running `package` to be strict in distributing ([#11160](https://github.com/sveltejs/kit/pull/11160))

- breaking: undefined is no longer a valid value for paths.relative ([#11185](https://github.com/sveltejs/kit/pull/11185))

- breaking: require Node 18.13 or newer ([#11172](https://github.com/sveltejs/kit/pull/11172))

- breaking: fix path resolution ([#11276](https://github.com/sveltejs/kit/pull/11276))

- breaking: remove `dangerZone.trackServerFetches` ([#11235](https://github.com/sveltejs/kit/pull/11235))

### Minor Changes

- feat: add untrack to load ([#11311](https://github.com/sveltejs/kit/pull/11311))

- feat: implement shallow routing ([#11307](https://github.com/sveltejs/kit/pull/11307))

- feat: provide SvelteKit html typings ([#11222](https://github.com/sveltejs/kit/pull/11222))

- feat: redact internal stack trace when reporting config errors ([#11292](https://github.com/sveltejs/kit/pull/11292))

- feat: allow for fine grained invalidation of search params ([#11258](https://github.com/sveltejs/kit/pull/11258))

### Patch Changes

- fix: prerender optional parameters as empty when `entries` contains `'*'` ([#11178](https://github.com/sveltejs/kit/pull/11178))

- fix: resolve route config correctly ([#11256](https://github.com/sveltejs/kit/pull/11256))

- fix: import Svelte types from svelte/compiler ([#11188](https://github.com/sveltejs/kit/pull/11188))

- fix: reset invalid resources after a successful invalidation ([#11268](https://github.com/sveltejs/kit/pull/11268))

- fix: Adjust fail method and ActionFailure type ([#11260](https://github.com/sveltejs/kit/pull/11260))

- chore(deps): upgrade cookies dependency ([#11189](https://github.com/sveltejs/kit/pull/11189))

## 1.30.3

### Patch Changes

- fix: correct documentation for beforeNavigate ([#11300](https://github.com/sveltejs/kit/pull/11300))

## 1.30.2

### Patch Changes

- fix: revert recent 'correctly return 415' and 'correctly return 404' changes ([#11295](https://github.com/sveltejs/kit/pull/11295))

## 1.30.1

### Patch Changes

- fix: prerendered root page with `paths.base` config uses correct trailing slash option ([#10763](https://github.com/sveltejs/kit/pull/10763))

- fix: correctly return 404 when a form action is not found ([#11278](https://github.com/sveltejs/kit/pull/11278))

## 1.30.0

### Minor Changes

- feat: inline `response.arrayBuffer()` during ssr ([#10535](https://github.com/sveltejs/kit/pull/10535))

### Patch Changes

- fix: allow `"false"` value for preload link options ([#10555](https://github.com/sveltejs/kit/pull/10555))

- fix: call worker `unref` instead of `terminate` ([#10120](https://github.com/sveltejs/kit/pull/10120))

- fix: correctly analyse exported server API methods during build ([#11019](https://github.com/sveltejs/kit/pull/11019))

- fix: avoid error when back navigating before page is initialized ([#10636](https://github.com/sveltejs/kit/pull/10636))

- fix: allow service-worker.js to import assets ([#9285](https://github.com/sveltejs/kit/pull/9285))

- fix: distinguish better between not-found and internal-error ([#11131](https://github.com/sveltejs/kit/pull/11131))

## 1.29.1

### Patch Changes

- fix: correctly return 415 when unexpected content types are submitted to actions ([#11255](https://github.com/sveltejs/kit/pull/11255))

- chore: deprecate `preloadCode` calls with multiple arguments ([#11266](https://github.com/sveltejs/kit/pull/11266))

## 1.29.0

### Minor Changes

- feat: add `resolveRoute` to `$app/paths`, deprecate `resolvePath` ([#11261](https://github.com/sveltejs/kit/pull/11261))

## 1.28.0

### Minor Changes

- chore: deprecate top level promise await behaviour ([#11175](https://github.com/sveltejs/kit/pull/11175))

### Patch Changes

- fix: resolve relative cookie paths before storing ([#11253](https://github.com/sveltejs/kit/pull/11253))

- chore: deprecate cookies.set/delete without path option ([#11237](https://github.com/sveltejs/kit/pull/11237))

- fix: make sure promises from fetch handle errors ([#11228](https://github.com/sveltejs/kit/pull/11228))

## 1.27.7

### Patch Changes

- fix: set runes option in generated root ([#11111](https://github.com/sveltejs/kit/pull/11111))

- fix: retain URL query string for trailing slash redirects to prerendered pages ([#11142](https://github.com/sveltejs/kit/pull/11142))

## 1.27.6

### Patch Changes

- fix: use runes in generated root when detecting Svelte 5 ([#11028](https://github.com/sveltejs/kit/pull/11028))

- fix: correctly prerender pages that use browser globals and have SSR turned off ([#11032](https://github.com/sveltejs/kit/pull/11032))

- fix: correctly show 404 for prerendered dynamic routes when navigating client-side without a root layout server load ([#11025](https://github.com/sveltejs/kit/pull/11025))

## 1.27.5

### Patch Changes

- fix: add vite.config.js to included files in generated tsconfig ([#10788](https://github.com/sveltejs/kit/pull/10788))

- fix: cache location.origin on startup ([#11004](https://github.com/sveltejs/kit/pull/11004))

## 1.27.4

### Patch Changes

- fix: generate `__data.json` for prerendered pages when SSR is turned off ([#10988](https://github.com/sveltejs/kit/pull/10988))

- chore: add experimental compatibility for Svelte 5 ([#11002](https://github.com/sveltejs/kit/pull/11002))

## 1.27.3

### Patch Changes

- fix: use correct environment file for rendering spa fallback page ([#10963](https://github.com/sveltejs/kit/pull/10963))

## 1.27.2

### Patch Changes

- fix: missing `File` Node polyfill for Node version 18.11.0+ ([#10948](https://github.com/sveltejs/kit/pull/10948))

## 1.27.1

### Patch Changes

- fix: only apply some polyfills below node 18.11 ([#10920](https://github.com/sveltejs/kit/pull/10920))

## 1.27.0

### Minor Changes

- feat: add `invalidateAll` boolean option to `enhance` callback ([#9889](https://github.com/sveltejs/kit/pull/9889))

## 1.26.0

### Minor Changes

- feat: infer route parameter type from matcher's guard check if applicable ([#10755](https://github.com/sveltejs/kit/pull/10755))

### Patch Changes

- fix: basic mime type handling for prerendered pages in preview ([#10851](https://github.com/sveltejs/kit/pull/10851))

- chore: use just a single library (mrmime) for mime type handling ([#10851](https://github.com/sveltejs/kit/pull/10851))

- chore: bump undici to address security issue ([#10885](https://github.com/sveltejs/kit/pull/10885))

- fix: follow whatwg fetch spec for handling redirect loops ([#10857](https://github.com/sveltejs/kit/pull/10857))

- fix: use `window.fetch` in `load` functions to allow libraries to patch it ([#10009](https://github.com/sveltejs/kit/pull/10009))

- chore(deps): update dependency undici to ~5.26.0 ([#10860](https://github.com/sveltejs/kit/pull/10860))

## 1.25.2

### Patch Changes

- fix: correctly update `$page.url.hash` when navigating history ([#10843](https://github.com/sveltejs/kit/pull/10843))

- fix: strip virtual module prefix from error messages ([#10776](https://github.com/sveltejs/kit/pull/10776))

- fix: cancel ongoing navigation when the browser back button is hit to prevent an incorrect page from being rendered ([#10727](https://github.com/sveltejs/kit/pull/10727))

- fix: only remove Vite manifest when copying files ([#10782](https://github.com/sveltejs/kit/pull/10782))

## 1.25.1

### Patch Changes

- fix: correct line numbers in stack trace ([#10769](https://github.com/sveltejs/kit/pull/10769))

- fix: correctly return 404 when navigating to a missing page and the root layout fetches a prerendered endpoint ([#10565](https://github.com/sveltejs/kit/pull/10565))

- fix: allow optional param in middle of route ([#10736](https://github.com/sveltejs/kit/pull/10736))

- chore: update `undici` ([#10641](https://github.com/sveltejs/kit/pull/10641))

## 1.25.0

### Minor Changes

- feat: add server endpoint catch-all method handler `fallback` ([#9755](https://github.com/sveltejs/kit/pull/9755))

### Patch Changes

- fix: allow calling `fetch` for any scheme ([#10699](https://github.com/sveltejs/kit/pull/10699))

## 1.24.1

### Patch Changes

- fix: mark aborted/cancelled navigation as handled ([#10666](https://github.com/sveltejs/kit/pull/10666))

## 1.24.0

### Minor Changes

- feat: onNavigate lifecycle function ([#9605](https://github.com/sveltejs/kit/pull/9605))

### Patch Changes

- fix: Use Proxy to track usage of client side load `event.route` ([#10576](https://github.com/sveltejs/kit/pull/10576))

## 1.23.1

### Patch Changes

- fix: process globs in `pkg.workspaces` ([#10625](https://github.com/sveltejs/kit/pull/10625))

## 1.23.0

### Minor Changes

- feat: add warning for mistyped route filenames ([#10558](https://github.com/sveltejs/kit/pull/10558))

- feat: accept `URL` in `redirect` ([#10570](https://github.com/sveltejs/kit/pull/10570))

### Patch Changes

- fix: adjust the type of `Navigation["type"]` ([#10599](https://github.com/sveltejs/kit/pull/10599))

- fix: allow logging `$page.url` during prerendering ([#10567](https://github.com/sveltejs/kit/pull/10567))

## 1.22.6

### Patch Changes

- fix: correctly restore trailing slash in url pathname for data requests ([#10475](https://github.com/sveltejs/kit/pull/10475))

- fix: load trailing slash option from server even when there's no load function ([#10475](https://github.com/sveltejs/kit/pull/10475))

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

- fix: add `submitter` type to `SubmitFunction` ([#9484](https://github.com/sveltejs/kit/pull/9484))

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

First major release, see [CHANGELOG-pre-1.md](CHANGELOG-pre-1.md) for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch
