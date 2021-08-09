# @sveltejs/kit

## 1.0.0-next.144

### Patch Changes

- 241dd623: [fix] point at true dev entry point

## 1.0.0-next.143

### Patch Changes

- 8c0ffb8f: [fix] provide explicit JS entry point for Vite dev mode ([https://github.com/sveltejs/kit/pulls/2134](#2134))
- c3c25ee0: [fix] take into account page-level options on error pages ([https://github.com/sveltejs/kit/pulls/2117](#2117))

## 1.0.0-next.142

### Patch Changes

- aed1bd07: [fix] fully initialize router before rendering ([https://github.com/sveltejs/kit/pulls/2089](#2089))
- 970bb04c: restore reverted config changes ([https://github.com/sveltejs/kit/pulls/2093](#2093))

## 1.0.0-next.141

### Patch Changes

- d109a394: [fix] successfully load nested error pages ([https://github.com/sveltejs/kit/pulls/2076](#2076))
- fab67c94: [fix] successfully handle client errors ([https://github.com/sveltejs/kit/pulls/2077](#2077))
- 943f5288: [fix] solve regression parsing unicode URLs ([https://github.com/sveltejs/kit/pulls/2078](#2078))
- 4435a659: [fix] allow endpoint shadowing to work ([https://github.com/sveltejs/kit/pulls/2074](#2074))
- ee73a265: [fix] correctly do fallthrough in simple case ([https://github.com/sveltejs/kit/pulls/2072](#2072))

## 1.0.0-next.140

### Patch Changes

- e55bc44a: [fix] revert change to rendering options ([https://github.com/sveltejs/kit/pulls/2008](#2008))
- d81de603: revert adapters automatically updating .gitignore ([https://github.com/sveltejs/kit/pulls/1924](#1924))
- 5911b1c7: [fix] consider protocol-relative URLs as external ([https://github.com/sveltejs/kit/pulls/2062](#2062))

## 1.0.0-next.139

### Patch Changes

- 883d4b85: Add public API to let adapters update .gitignore ([https://github.com/sveltejs/kit/pulls/1924](#1924))
- 8cbe3b05: Change `force` to `onError` in prerender config options ([https://github.com/sveltejs/kit/pulls/2030](#2030))
- 1b18a844: Don't check external links on prerender ([https://github.com/sveltejs/kit/pulls/1679](#1679))
- 7645399a: [fix] correctly pass Vite options in preview mode ([https://github.com/sveltejs/kit/pulls/2036](#2036))

## 1.0.0-next.138

### Patch Changes

- d6563169: [chore] prefer interfaces to types ([https://github.com/sveltejs/kit/pulls/2010](#2010))
- b18a45c1: explicitly set compilerOptions.hydratable to config.kit.hydrate ([https://github.com/sveltejs/kit/pulls/2024](#2024))
- 538de3eb: [feat] More powerful and configurable rendering options ([https://github.com/sveltejs/kit/pulls/2008](#2008))
- 20dad18a: Remove the `prerender.force` option in favor of `prerender.onError` ([https://github.com/sveltejs/kit/pulls/2007](#2007))

## 1.0.0-next.137

### Patch Changes

- bce1d76a: [chore] improved typing for runtime and tests ([https://github.com/sveltejs/kit/pulls/1995](#1995))
- 2a1e9795: [chore] enable TypeScript strict mode ([https://github.com/sveltejs/kit/pulls/1998](#1998))

## 1.0.0-next.136

### Patch Changes

- 69b92ec1: [chore] improved typing on core library ([https://github.com/sveltejs/kit/pulls/1993](#1993))

## 1.0.0-next.135

### Patch Changes

- 3b293f2a: update svelte to 3.40 and vite-plugin-svelte to 1.0.0-next.14 ([https://github.com/sveltejs/kit/pulls/1992](#1992))
- 34b923d1: [chore] stricter TypeScript checking ([https://github.com/sveltejs/kit/pulls/1989](#1989))

## 1.0.0-next.134

### Patch Changes

- e1e5920a: [fix] correctly find links during prerendering ([https://github.com/sveltejs/kit/pulls/1984](#1984))
- c7db715e: Handle errors with incorrect type ([https://github.com/sveltejs/kit/pulls/1983](#1983))

## 1.0.0-next.133

### Patch Changes

- 68190496: chore: Vite to ^2.4.3, vite-plugin-svelte to ^1.0.0-next.13 ([https://github.com/sveltejs/kit/pulls/1969](#1969))
- 0cbcd7c3: [fix] correctly detect external fetches ([https://github.com/sveltejs/kit/pulls/1980](#1980))
- 51ec789f: Scrolling to an anchor via a hash now supports `scroll-*` CSS properties ([https://github.com/sveltejs/kit/pulls/1972](#1972))

## 1.0.0-next.132

### Patch Changes

- 7b440b2b: Fix URL resolution for server-side fetch ([https://github.com/sveltejs/kit/pulls/1953](#1953))

## 1.0.0-next.131

### Patch Changes

- 0bc1b309: Minor optimization in parse_body ([https://github.com/sveltejs/kit/pulls/1916](#1916))

## 1.0.0-next.130

### Patch Changes

- 53e9285d: feat(config): Friendlier error messages for common errors ([https://github.com/sveltejs/kit/pulls/1910](#1910))
- 41da1ebe: Handle 4xx and 5xx statuses without requiring `Error` instance ([https://github.com/sveltejs/kit/pulls/1811](#1811))
- 073fc3b5: feat(cli): respect NODE_ENV when set by user ([https://github.com/sveltejs/kit/pulls/1915](#1915))

## 1.0.0-next.129

### Patch Changes

- e246455: Passthrough server-side fetch cookies for most same-origin scenarios ([https://github.com/sveltejs/kit/pulls/1847](#1847))

## 1.0.0-next.128

### Patch Changes

- 27e9067: Better error messages when something goes wrong while emitting types ([https://github.com/sveltejs/kit/pulls/1903](#1903))
- 277029d: Change index.js exports to directory exports when packaging ([https://github.com/sveltejs/kit/pulls/1905](#1905))

## 1.0.0-next.127

### Patch Changes

- bb3ae21: Fix endpoint validation to allow returning string for all content types ([https://github.com/sveltejs/kit/pulls/1900](#1900))

## 1.0.0-next.126

### Patch Changes

- 4720b67: Default body parsing to binary ([https://github.com/sveltejs/kit/pulls/1890](#1890))
- 6da07b8: fix returning null from endpoints ([https://github.com/sveltejs/kit/pulls/1886](#1886))

## 1.0.0-next.125

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types ([https://github.com/sveltejs/kit/pulls/1687](#1687))
- f854b89: Replace return type of Buffer with Uint8Array ([https://github.com/sveltejs/kit/pulls/1876](#1876))
- f854b89: Remove Incoming from public types ([https://github.com/sveltejs/kit/pulls/1876](#1876))

## 1.0.0-next.124

### Patch Changes

- 34d2049: handle undefined body on endpoint output ([https://github.com/sveltejs/kit/pulls/1808](#1808))
- c826016: add config.kit.package.emitTypes ([https://github.com/sveltejs/kit/pulls/1852](#1852))
- 8854e2f: Bump vite-plugin-svelte to 1.0.0-next.12 ([https://github.com/sveltejs/kit/pulls/1869](#1869))
- af1aa54: copy essential root files on `svelte-kit package` ([https://github.com/sveltejs/kit/pulls/1747](#1747))
- 872840a: Pass along custom properties added to Error ([https://github.com/sveltejs/kit/pulls/1821](#1821))
- 868f97a: Preserve README casing and package.json contents on svelte-kit package ([https://github.com/sveltejs/kit/pulls/1735](#1735))

## 1.0.0-next.123

### Patch Changes

- 4b25615: Fix ReadOnlyFormData keys and values method implementation ([https://github.com/sveltejs/kit/pulls/1837](#1837))
- 64f749d: ServiceWorker files exclusion support available through svelte.config.js ([https://github.com/sveltejs/kit/pulls/1645](#1645))
- 4d2fec5: Enable Vite's server.fs.strict by default ([https://github.com/sveltejs/kit/pulls/1842](#1842))
- 1ec368a: Expose Vite.js mode from \$app/env ([https://github.com/sveltejs/kit/pulls/1789](#1789))

## 1.0.0-next.122

### Patch Changes

- d09a4e1: Surface Svelte compiler errors ([https://github.com/sveltejs/kit/pulls/1827](#1827))
- 79b4fe2: Update Vite to ^2.4.1 ([https://github.com/sveltejs/kit/pulls/1834](#1834))
- 2ac5781: Use esbuild inject API to insert shims ([https://github.com/sveltejs/kit/pulls/1822](#1822))

## 1.0.0-next.121

### Patch Changes

- 939188e: Use UTF-8 encoding for JSON endpoint responses by default ([https://github.com/sveltejs/kit/pulls/1669](#1669))
- 5b3e1e6: Add types generation to svelte-kit package command ([https://github.com/sveltejs/kit/pulls/1646](#1646))
- 8affef2: Fix type errors inside ReadOnlyFormData that didn't allow it to be used inside for..of loops ([https://github.com/sveltejs/kit/pulls/1830](#1830))

## 1.0.0-next.120

### Patch Changes

- 9fbaeda: fix attribute validation in generated script tag ([https://github.com/sveltejs/kit/pulls/1768](#1768))
- 9f0c54a: Externalize app initialization to adapters ([https://github.com/sveltejs/kit/pulls/1804](#1804))
- 0d69e55: Add generic type for session ([https://github.com/sveltejs/kit/pulls/1791](#1791))
- 325c223: Improve RequestHandler and EndpointOutput type declarations. ([https://github.com/sveltejs/kit/pulls/1778](#1778))
- 6ef148d: Generate service worker registration code even with `router` and `hydration` disabled ([https://github.com/sveltejs/kit/pulls/1724](#1724))
- ae3ef19: Fail if config.kit.appDir starts or ends with a slash ([https://github.com/sveltejs/kit/pulls/1695](#1695))

## 1.0.0-next.119

### Patch Changes

- 064f848: Implement serverFetch hook
- 882fb12: Add keepfocus option to goto

## 1.0.0-next.118

### Patch Changes

- 5418254: Fix regex for getting links to crawl during prerendering ([https://github.com/sveltejs/kit/pulls/1743](#1743))

## 1.0.0-next.117

### Patch Changes

- 828732c: Specify actual Svelte version requirement ([https://github.com/sveltejs/kit/pulls/1751](#1751))

## 1.0.0-next.116

### Patch Changes

- ea8cd54: chore(kit): correct `engines` constraint ([https://github.com/sveltejs/kit/pulls/1696](#1696))
- aedec24: Ensure router is initialized before parsing location ([https://github.com/sveltejs/kit/pulls/1691](#1691))
- c7d5ce4: update vite to 2.3.8 and unpin ([https://github.com/sveltejs/kit/pulls/1715](#1715))
- d259bca: Stricter regex for getting element attributes during prerendering ([https://github.com/sveltejs/kit/pulls/1700](#1700))

## 1.0.0-next.115

### Patch Changes

- 523c3e2: Allow vite.alias to be an array ([https://github.com/sveltejs/kit/pulls/1640](#1640))
- 6fd46d1: \* update vite-plugin-svelte to 1.0.0-next.11 and use its named export ([https://github.com/sveltejs/kit/pulls/1673](#1673))
  - update vite to 2.3.7
- dc56d3c: Fix navigation when `base` path is set and validate that option's value ([https://github.com/sveltejs/kit/pulls/1666](#1666))

## 1.0.0-next.114

### Patch Changes

- 5aa64ab: fix: SSL for HMR websockets [https://github.com/sveltejs/kit/pulls/844](#844) ([https://github.com/sveltejs/kit/pulls/1517](#1517))
- fae75f1: add optional state parameter for goto function ([https://github.com/sveltejs/kit/pulls/1643](#1643))
- fbd5f8a: package command can now transpile TypeScript files ([https://github.com/sveltejs/kit/pulls/1633](#1633))

## 1.0.0-next.113

### Patch Changes

- 045c45c: update vite to 2.3.6 ([https://github.com/sveltejs/kit/pulls/1625](#1625))

## 1.0.0-next.112

### Patch Changes

- cbe029e: Allow non-lowercase 'content-type' header in ssr fetch requests ([https://github.com/sveltejs/kit/pulls/1463](#1463))
- 1bf1a02: Make it possible to type context, page params and props for LoadInput and LoadOutput ([https://github.com/sveltejs/kit/pulls/1447](#1447))

## 1.0.0-next.111

### Patch Changes

- eae1b1d: Rename handle's render parameter to resolve ([https://github.com/sveltejs/kit/pulls/1566](#1566))

## 1.0.0-next.110

### Patch Changes

- 6372690: Add svelte-kit package command ([https://github.com/sveltejs/kit/pulls/1499](#1499))
- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s) ([https://github.com/sveltejs/kit/pulls/1528](#1528))
- bf77940: bump `polka` and `sirv` dependency versions ([https://github.com/sveltejs/kit/pulls/1548](#1548))
- 2172469: Upgrade to Vite 2.3.4 ([https://github.com/sveltejs/kit/pulls/1580](#1580))
- 028abd9: Pass validated svelte config to adapter adapt function ([https://github.com/sveltejs/kit/pulls/1559](#1559))

## 1.0.0-next.109

### Patch Changes

- 261ee1c: Update compatible Node versions ([https://github.com/sveltejs/kit/pulls/1470](#1470))
- ec156c6: let hash only changes be handled by router ([https://github.com/sveltejs/kit/pulls/830](#830))
- 586785d: Allow passing HTTPS key pair in Vite section of config ([https://github.com/sveltejs/kit/pulls/1456](#1456))

## 1.0.0-next.108

### Patch Changes

- dad93fc: Fix workspace dependencies ([https://github.com/sveltejs/kit/pulls/1434](#1434))
- 37fc04f: Ignore URLs that the app does not own ([https://github.com/sveltejs/kit/pulls/1487](#1487))

## 1.0.0-next.107

### Patch Changes

- ad83d40: update vite to ^2.3.1 ([https://github.com/sveltejs/kit/pulls/1429](#1429))

## 1.0.0-next.106

### Patch Changes

- fe0531d: temporarily pin vite to version 2.2.4 until issues with 2.3.0 are resolved ([https://github.com/sveltejs/kit/pulls/1423](#1423))

## 1.0.0-next.105

### Patch Changes

- f3c50a0: Bump Vite to 2.3.0 ([https://github.com/sveltejs/kit/pulls/1413](#1413))
- cfd6c3c: Use rendered CSS for AMP pages ([https://github.com/sveltejs/kit/pulls/1408](#1408))
- 9a2cc0a: Add trailingSlash: 'never' | 'always' | 'ignore' option ([https://github.com/sveltejs/kit/pulls/1404](#1404))

## 1.0.0-next.104

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node ([https://github.com/sveltejs/kit/pulls/1391](#1391))

## 1.0.0-next.103

### Patch Changes

- 11e7840: Generate ETags for binary response bodies ([https://github.com/sveltejs/kit/pulls/1382](#1382))
- 11e7840: Update request/response body types ([https://github.com/sveltejs/kit/pulls/1382](#1382))
- 9e20873: Allow ServerResponse to have non-static set of headers ([https://github.com/sveltejs/kit/pulls/1375](#1375))
- 2562ca0: Account for POST bodies when serializing fetches ([https://github.com/sveltejs/kit/pulls/1385](#1385))

## 1.0.0-next.102

### Patch Changes

- b5ff7f5: Rename \$layout to \_\_layout etc ([https://github.com/sveltejs/kit/pulls/1370](#1370))
- d871213: Make Vite a prod dep of SvelteKit ([https://github.com/sveltejs/kit/pulls/1374](#1374))

## 1.0.0-next.101

### Patch Changes

- f5e626d: Reference Vite/Svelte types inside Kit types ([https://github.com/sveltejs/kit/pulls/1319](#1319))

## 1.0.0-next.100

### Patch Changes

- 9890492: Use TypedArray.set to copy from Uint8Array when getting raw body in core/http ([https://github.com/sveltejs/kit/pulls/1349](#1349))

## 1.0.0-next.99

### Patch Changes

- 051c026: Remove getContext in favour of request.locals ([https://github.com/sveltejs/kit/pulls/1332](#1332))

## 1.0.0-next.98

### Patch Changes

- d279e36: Add invalidate(url) API for re-running load functions ([https://github.com/sveltejs/kit/pulls/1303](#1303))

## 1.0.0-next.97

### Patch Changes

- 694f5de: Fixes `navigating` store type ([https://github.com/sveltejs/kit/pulls/1322](#1322))
- 0befffb: Rename .svelte to .svelte-kit ([https://github.com/sveltejs/kit/pulls/1321](#1321))
- c6fde99: Switch to ESM in config files ([https://github.com/sveltejs/kit/pulls/1323](#1323))

## 1.0.0-next.96

### Patch Changes

- 63eff1a: Add prerendering to \$app/env typings ([https://github.com/sveltejs/kit/pulls/1316](#1316))

## 1.0.0-next.95

### Patch Changes

- 16cca89: Export AdapterUtils type for use in adapters ([https://github.com/sveltejs/kit/pulls/1300](#1300))
- f3ef93d: Not calling JSON.stringify on endpoint's body if it's a string and the content-type header denotes json ([https://github.com/sveltejs/kit/pulls/1272](#1272))
- 5023e98: Remove 'Navigated to' text from announcer' ([https://github.com/sveltejs/kit/pulls/1305](#1305))
- b4d0d6c: Normalize keys of headers from server side requests
- 08ebcb5: Add esm config support ([https://github.com/sveltejs/kit/pulls/936](#936))
- 427e8e0: Validate template file on startup ([https://github.com/sveltejs/kit/pulls/1304](#1304))

## 1.0.0-next.94

### Patch Changes

- 72c78a4: Handle URLs that need to be decoded ([https://github.com/sveltejs/kit/pulls/1273](#1273))

## 1.0.0-next.93

### Patch Changes

- 353afa1: Disable FLoC by default ([https://github.com/sveltejs/kit/pulls/1267](#1267))

## 1.0.0-next.92

### Patch Changes

- 354e384: Allow FormData to be passed as RequestHandler type Body argument ([https://github.com/sveltejs/kit/pulls/1256](#1256))
- b1bfe83: Show error page on unknown initial path. Fixes [https://github.com/sveltejs/kit/pulls/1190](#1190).

## 1.0.0-next.91

### Patch Changes

- 82955ec: fix: adapt to svelte ids without ?import in vite 2.2.3

## 1.0.0-next.90

### Patch Changes

- ac60208: Exit process after adapting ([https://github.com/sveltejs/kit/pulls/1212](#1212))

## 1.0.0-next.89

### Patch Changes

- 927e63c: update the error message of prerender to optionally include the parent variable ([https://github.com/sveltejs/kit/pulls/1200](#1200))

## 1.0.0-next.88

### Patch Changes

- 6f2b4a6: Remove references to npm start ([https://github.com/sveltejs/kit/pulls/1196](#1196))

## 1.0.0-next.87

### Patch Changes

- 4131467: Prerender fallback page for SPAs ([https://github.com/sveltejs/kit/pulls/1181](#1181))

## 1.0.0-next.86

### Patch Changes

- 2130087: Support multiple rel values on anchor tag ([https://github.com/sveltejs/kit/pulls/884](#884))
- ba732ff: Report errors in hooks.js ([https://github.com/sveltejs/kit/pulls/1178](#1178))
- a2f3f4b: Rename `start` to `preview` in the CLI and package scripts

## 1.0.0-next.85

### Patch Changes

- 4645ad5: Force Vite to bundle Svelte component libraries in SSR ([https://github.com/sveltejs/kit/pulls/1148](#1148))
- abf0248: Fix \$service-worker types

## 1.0.0-next.84

### Patch Changes

- 5c2665f: Prevent ...rest parameters from swallowing earlier characters ([https://github.com/sveltejs/kit/pulls/1128](#1128))
- 4e1c4ea: Omit modulepreload links from pages with no JS ([https://github.com/sveltejs/kit/pulls/1131](#1131))
- 5d864a6: Fix RequestHandler return type
- e1313d0: Make response.body optional

## 1.0.0-next.83

### Patch Changes

- a4a1075: Work around apparent Cloudflare Workers platform bugs ([https://github.com/sveltejs/kit/pulls/1123](#1123))

## 1.0.0-next.82

### Patch Changes

- 4af45e1: Remove usage of node built-ins from runtime ([https://github.com/sveltejs/kit/pulls/1117](#1117))

## 1.0.0-next.81

### Patch Changes

- 1237eb3: Expose rawBody on request, and expect rawBody from adapters ([https://github.com/sveltejs/kit/pulls/1109](#1109))
- 1237eb3: Expose getRawBody from kit/http ([https://github.com/sveltejs/kit/pulls/1109](#1109))

## 1.0.0-next.80

### Patch Changes

- 7a4b351: Expose install-fetch subpackage for adapters to use ([https://github.com/sveltejs/kit/pulls/1091](#1091))

## 1.0.0-next.79

### Patch Changes

- d3abd97: Fix Windows build output containing backward slashes ([https://github.com/sveltejs/kit/pulls/1096](#1096))

## 1.0.0-next.78

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([https://github.com/sveltejs/kit/pulls/1066](#1066))
- 61d7fa0: Better error logging ([https://github.com/sveltejs/kit/pulls/1062](#1062))
- 041b706: Implement layout resets ([https://github.com/sveltejs/kit/pulls/1061](#1061))
- 148819a: Use latest vite-plugin-svelte ([https://github.com/sveltejs/kit/pulls/1057](#1057))
- 9d54eed: Make sveltekit:prefetch a noop if <a> has no href ([https://github.com/sveltejs/kit/pulls/1060](#1060))

## 1.0.0-next.77

### Patch Changes

- fee388a: Include CSS for entry point/generated component ([https://github.com/sveltejs/kit/pulls/1053](#1053))

## 1.0.0-next.76

### Patch Changes

- f870909: Pin vite-plugin-svelte version ([https://github.com/sveltejs/kit/pulls/1026](#1026))
- de2466f: Fix stale prerendering bug ([https://github.com/sveltejs/kit/pulls/1040](#1040))

## 1.0.0-next.75

### Patch Changes

- 0c02dc0: Use global URLSearchParams instead of import from node url ([https://github.com/sveltejs/kit/pulls/1020](#1020))
- 8021d6b: Fix default error page ([https://github.com/sveltejs/kit/pulls/1021](#1021))
- 11ec751: Fix build warnings about missing exports in hooks file ([https://github.com/sveltejs/kit/pulls/1003](#1003))

## 1.0.0-next.74

### Patch Changes

- 4c45784: Add ambient types to published files ([https://github.com/sveltejs/kit/pulls/980](#980))

## 1.0.0-next.73

### Patch Changes

- 1007f67: Allow non-root \$error.svelte components ([https://github.com/sveltejs/kit/pulls/901](#901))
- ca108a6: Change `handle` hook from positional arguments to named arguments ([https://github.com/sveltejs/kit/pulls/959](#959))

## 1.0.0-next.72

### Patch Changes

- 1d5228c: Make --open option work with --https ([https://github.com/sveltejs/kit/pulls/921](#921))
- 39b6967: Add ambient type definitions for \$app imports ([https://github.com/sveltejs/kit/pulls/917](#917))
- 1d5228c: Make --open option work on WSL ([https://github.com/sveltejs/kit/pulls/921](#921))
- bb2d97d: Fix argument type for RequestHandler ([https://github.com/sveltejs/kit/pulls/914](#914))

## 1.0.0-next.71

### Patch Changes

- 108c26c: Always return a response from render function in handle ([https://github.com/sveltejs/kit/pulls/847](#847))

## 1.0.0-next.70

### Patch Changes

- 6d9f7b1: Only include CSS on an SSR'd page ([https://github.com/sveltejs/kit/pulls/839](#839))
- 6ecfa2c: Remove duplicate <style> element ([https://github.com/sveltejs/kit/pulls/845](#845))

## 1.0.0-next.69

### Patch Changes

- 4d2cd62: Add prerendering to \$app/env ([https://github.com/sveltejs/kit/pulls/833](#833))
- e2eeeea: Call load when path changes if page.path is used ([https://github.com/sveltejs/kit/pulls/838](#838))
- 50b5526: Pass through credentials when fetching in load ([https://github.com/sveltejs/kit/pulls/835](#835))
- 6384af6: Only inline data if hydrate=true ([https://github.com/sveltejs/kit/pulls/837](#837))

## 1.0.0-next.68

### Patch Changes

- 24fab19: Add --https flag to dev and start ([https://github.com/sveltejs/kit/pulls/462](#462))
- ba4f9b7: Check port, only expose to network with --host flag ([https://github.com/sveltejs/kit/pulls/819](#819))

## 1.0.0-next.67

### Patch Changes

- 679e997: Fix client-side redirect loop detection ([https://github.com/sveltejs/kit/pulls/811](#811))
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it ([https://github.com/sveltejs/kit/pulls/787](#787))
- 78aec0c: Detect service worker support
- f33a22c: Make ...rest parameters optional ([https://github.com/sveltejs/kit/pulls/768](#768))

## 1.0.0-next.66

### Patch Changes

- d9ce2a2: Correct response type for fetch ([https://github.com/sveltejs/kit/pulls/799](#799))

## 1.0.0-next.65

### Patch Changes

- c0b9873: Always apply layout props when hydrating ([https://github.com/sveltejs/kit/pulls/794](#794))
- b8a8e53: Add type to config.kit.vite ([https://github.com/sveltejs/kit/pulls/786](#786))
- 9b09bcc: Prevent XSS when serializing fetch results ([https://github.com/sveltejs/kit/pulls/769](#769))

## 1.0.0-next.64

### Patch Changes

- 7f58512: Prevent Vite prebundling from crashing on startup ([https://github.com/sveltejs/kit/pulls/759](#759))

## 1.0.0-next.63

### Patch Changes

- 31f94fe: Add ssr, router and hydrate options

## 1.0.0-next.62

### Patch Changes

- 864c3d4: Assets imported from css and js/ts files are emitted as files instead of being inlined ([https://github.com/sveltejs/kit/pulls/461](#461))

## 1.0.0-next.61

### Patch Changes

- 4b2c97e: Initialise router with history.state

## 1.0.0-next.60

### Patch Changes

- 84e9023: Fix host property ([https://github.com/sveltejs/kit/pulls/657](#657))
- 272148b: Rename \$service-worker::assets to files, per the docs ([https://github.com/sveltejs/kit/pulls/658](#658))
- d5071c5: Hydrate initial page before starting router ([https://github.com/sveltejs/kit/pulls/654](#654))
- 4a1c04a: More accurate MODULE_NOT_FOUND errors ([https://github.com/sveltejs/kit/pulls/665](#665))
- d881b7e: Replace setup with hooks ([https://github.com/sveltejs/kit/pulls/670](#670))

## 1.0.0-next.59

### Patch Changes

- 826f39e: Make prefetching work ([https://github.com/sveltejs/kit/pulls/620](#620))

## 1.0.0-next.58

### Patch Changes

- 26893b0: Allow first argument to fetch in load to be a request ([https://github.com/sveltejs/kit/pulls/619](#619))
- 924db15: Add copy function to Builder.js ([https://github.com/sveltejs/kit/pulls/630](#630))

## 1.0.0-next.57

### Patch Changes

- 391189f: Check for options.initiator in correct place ([https://github.com/sveltejs/kit/pulls/615](#615))

## 1.0.0-next.56

### Patch Changes

- 82cbe2b: Shrink client manifest ([https://github.com/sveltejs/kit/pulls/593](#593))
- 8024178: remove @sveltejs/app-utils ([https://github.com/sveltejs/kit/pulls/600](#600))

## 1.0.0-next.55

### Patch Changes

- d0a7019: switch to @sveltejs/vite-plugin-svelte ([https://github.com/sveltejs/kit/pulls/584](#584))
- 8a88fad: Replace regex routes with fallthrough routes ([https://github.com/sveltejs/kit/pulls/583](#583))

## 1.0.0-next.54

### Patch Changes

- 3037530: Create history entry for initial route ([https://github.com/sveltejs/kit/pulls/582](#582))
- 04f17f5: Prevent erronous <style>undefined</style> ([https://github.com/sveltejs/kit/pulls/578](#578))
- 8805c6d: Pass adapters directly to svelte.config.cjs ([https://github.com/sveltejs/kit/pulls/579](#579))

## 1.0.0-next.53

### Patch Changes

- 9cf2f21: Only require page components to export prerender ([https://github.com/sveltejs/kit/pulls/577](#577))
- e860de0: Invalidate page when query changes ([https://github.com/sveltejs/kit/pulls/575](#575))
- 7bb1cf0: Disable vite-plugin-svelte transform cache ([https://github.com/sveltejs/kit/pulls/576](#576))

## 1.0.0-next.52

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs ([https://github.com/sveltejs/kit/pulls/569](#569))

## 1.0.0-next.51

### Patch Changes

- 34a00f9: Bypass router on hydration ([https://github.com/sveltejs/kit/pulls/563](#563))

## 1.0.0-next.50

### Patch Changes

- 0512fd1: Remove startGlobal option ([https://github.com/sveltejs/kit/pulls/559](#559))
- 9212aa5: Add options to adapter-node, and add adapter types ([https://github.com/sveltejs/kit/pulls/531](#531))
- 0512fd1: Fire custom events for start, and navigation start/end ([https://github.com/sveltejs/kit/pulls/559](#559))

## 1.0.0-next.49

### Patch Changes

- ab28c0a: kit: include missing types.d.ts ([https://github.com/sveltejs/kit/pulls/538](#538))
- c76c9bf: Upgrade Vite ([https://github.com/sveltejs/kit/pulls/544](#544))

## 1.0.0-next.48

### Patch Changes

- e37a302: Make getSession future-proof ([https://github.com/sveltejs/kit/pulls/524](#524))

## 1.0.0-next.47

### Patch Changes

- 5554acc: Add \$lib alias ([https://github.com/sveltejs/kit/pulls/511](#511))
- 5cd6f11: bump vite-plugin-svelte to 0.11.0 ([https://github.com/sveltejs/kit/pulls/513](#513))

## 1.0.0-next.46

### Patch Changes

- f35a5cd: Change adapter signature ([https://github.com/sveltejs/kit/pulls/505](#505))

## 1.0.0-next.45

### Patch Changes

- 925638a: Remove endpoints from the files built for the client ([https://github.com/sveltejs/kit/pulls/490](#490))
- c3cf3f3: Bump deps ([https://github.com/sveltejs/kit/pulls/492](#492))
- 625747d: kit: bundle @sveltejs/kit into built application ([https://github.com/sveltejs/kit/pulls/486](#486))
- Updated dependencies [c3cf3f3]
  - @sveltejs/vite-plugin-svelte@1.0.0-next.3

## 1.0.0-next.44

### Patch Changes

- e6449d2: Fix AMP styles for real ([https://github.com/sveltejs/kit/pulls/494](#494))

## 1.0.0-next.43

### Patch Changes

- 672e9be: Fix AMP styles, again ([https://github.com/sveltejs/kit/pulls/491](#491))

## 1.0.0-next.42

### Patch Changes

- 0f54ebc: Fix AMP styles ([https://github.com/sveltejs/kit/pulls/488](#488))

## 1.0.0-next.41

### Patch Changes

- 4aa5a73: Future-proof prepare argument ([https://github.com/sveltejs/kit/pulls/471](#471))
- 58dc400: Call correct set_paths function ([https://github.com/sveltejs/kit/pulls/487](#487))
- 2322291: Update to node-fetch@3

## 1.0.0-next.40

### Patch Changes

- 4c5fd3c: Include layout/error styles in SSR ([https://github.com/sveltejs/kit/pulls/472](#472))

## 1.0.0-next.39

### Patch Changes

- b7fdb0d: Skip pre-bundling ([https://github.com/sveltejs/kit/pulls/468](#468))

## 1.0.0-next.38

### Patch Changes

- 15402b1: Add service worker support ([https://github.com/sveltejs/kit/pulls/463](#463))
- 0c630b5: Ignore dynamically imported components when constructing styles in dev mode ([https://github.com/sveltejs/kit/pulls/443](#443))
- ac06af5: Fix svelte-kit adapt for Windows ([https://github.com/sveltejs/kit/pulls/435](#435))
- 061fa46: Implement improved redirect API
- b800049: Include type declarations ([https://github.com/sveltejs/kit/pulls/442](#442))
- 07c6de4: Use posix paths in manifest even on Windows ([https://github.com/sveltejs/kit/pulls/436](#436))
- 27ba872: Error if preload function exists ([https://github.com/sveltejs/kit/pulls/455](#455))
- 0c630b5: Add default paths in case singletons module is invalidated ([https://github.com/sveltejs/kit/pulls/443](#443))
- 73dd998: Allow custom extensions ([https://github.com/sveltejs/kit/pulls/411](#411))

## 1.0.0-next.37

### Patch Changes

- 230c6d9: Indicate which request failed, if fetch fails inside load function ([https://github.com/sveltejs/kit/pulls/427](#427))
- f1bc218: Run adapt via svelte-kit build ([https://github.com/sveltejs/kit/pulls/430](#430))
- 6850ddc: Fix svelte-kit start for Windows ([https://github.com/sveltejs/kit/pulls/425](#425))

## 1.0.0-next.36

### Patch Changes

- 7b70a33: Force version bump so that Kit uses updated vite-plugin-svelte ([https://github.com/sveltejs/kit/pulls/419](#419))

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

- 474070e: Better errors when modules cannot be found ([https://github.com/sveltejs/kit/pulls/381](#381))

## 1.0.0-next.32

### Patch Changes

- Convert everything to ESM

## 1.0.0-next.31

### Patch Changes

- b6c2434: app.js -> app.cjs ([https://github.com/sveltejs/kit/pulls/362](#362))

## 1.0.0-next.30

### Patch Changes

- 00cbaf6: Rename _.config.js to _.config.cjs ([https://github.com/sveltejs/kit/pulls/356](#356))

## 1.0.0-next.29

### Patch Changes

- 4c0edce: Use addEventListener instead of onload ([https://github.com/sveltejs/kit/pulls/347](#347))

## 1.0.0-next.28

### Patch Changes

- 4353025: Prevent infinite loop when fetching bad URLs inside error responses ([https://github.com/sveltejs/kit/pulls/340](#340))
- 2860065: Handle assets path when prerendering ([https://github.com/sveltejs/kit/pulls/341](#341))

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

- 26643df: Account for config.paths when prerendering ([https://github.com/sveltejs/kit/pulls/322](#322))

## 1.0.0-next.23

### Patch Changes

- 9b758aa: Upgrade to Snowpack 3 ([https://github.com/sveltejs/kit/pulls/321](#321))

## 1.0.0-next.22

### Patch Changes

- bb68595: use readFileSync instead of createReadStream ([https://github.com/sveltejs/kit/pulls/320](#320))

## 1.0.0-next.21

### Patch Changes

- 217e4cc: Set paths to empty string before prerender ([https://github.com/sveltejs/kit/pulls/317](#317))

## 1.0.0-next.20

### Patch Changes

- ccf4aa7: Implement prerender config ([https://github.com/sveltejs/kit/pulls/315](#315))

## 1.0.0-next.19

### Patch Changes

- deda984: Make navigating store contain from and to properties ([https://github.com/sveltejs/kit/pulls/313](#313))

## 1.0.0-next.18

### Patch Changes

- c29b61e: Announce page changes ([https://github.com/sveltejs/kit/pulls/311](#311))
- 72da270: Reset focus properly ([https://github.com/sveltejs/kit/pulls/309](#309))

## 1.0.0-next.17

### Patch Changes

- f7dea55: Set process.env.NODE_ENV when invoking via the CLI ([https://github.com/sveltejs/kit/pulls/304](#304))

## 1.0.0-next.16

### Patch Changes

- Remove temporary logging
- Add sveltekit:prefetch and sveltekit:noscroll

## 1.0.0-next.15

### Patch Changes

- 6d1bb11: Fix AMP CSS ([https://github.com/sveltejs/kit/pulls/286](#286))
- d8b53af: Ignore $layout and $error files when finding static paths
- Better scroll tracking

## 1.0.0-next.14

### Patch Changes

- Fix dev loader

## 1.0.0-next.13

### Patch Changes

- 1ea4d6b: More robust CSS extraction ([https://github.com/sveltejs/kit/pulls/279](#279))

## 1.0.0-next.12

### Patch Changes

- e7c88dd: Tweak AMP validation screen

## 1.0.0-next.11

### Patch Changes

- a31f218: Fix SSR loader invalidation ([https://github.com/sveltejs/kit/pulls/277](#277))

## 1.0.0-next.10

### Patch Changes

- 8b14d29: Omit svelte-data scripts from AMP pages ([https://github.com/sveltejs/kit/pulls/276](#276))

## 1.0.0-next.9

### Patch Changes

- f5fa223: AMP support ([https://github.com/sveltejs/kit/pulls/274](#274))
- 47f2ee1: Always remove trailing slashes ([https://github.com/sveltejs/kit/pulls/267](#267))
- 1becb94: Replace preload with load

## 1.0.0-next.8

### Patch Changes

- 15dd751: Use meta http-equiv=refresh ([https://github.com/sveltejs/kit/pulls/256](#256))
- be7e031: Fix handling of static files ([https://github.com/sveltejs/kit/pulls/258](#258))
- ed6b8fd: Implement \$app/env ([https://github.com/sveltejs/kit/pulls/251](#251))

## 1.0.0-next.7

### Patch Changes

- 76705b0: make HMR work outside localhost ([https://github.com/sveltejs/kit/pulls/246](#246))

## 1.0.0-next.6

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files ([https://github.com/sveltejs/kit/pulls/236](#236))
- fa7f2b2: Implement live bindings for SSR code ([https://github.com/sveltejs/kit/pulls/245](#245))

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

- a4bc090: Transform exported functions correctly ([https://github.com/sveltejs/kit/pulls/225](#225))
- 00bbf98: Fix nested layouts ([https://github.com/sveltejs/kit/pulls/227](#227))

## 0.0.31-next.0

### Patch Changes

- ffd7bba: Fix SSR cache invalidation ([https://github.com/sveltejs/kit/pulls/217](#217))

## 0.0.30

### Patch Changes

- Add back stores(), but with deprecation warning
- Rename stores.preloading to stores.navigating
- Rewrite routing logic

## 0.0.29

### Patch Changes

- 10872cc: Normalize request.query ([https://github.com/sveltejs/kit/pulls/196](#196))

## 0.0.28

### Patch Changes

- Add svelte-kit start command

## 0.0.27

### Patch Changes

- rename CLI to svelte-kit
- 0904e22: rename svelte CLI to svelte-kit ([https://github.com/sveltejs/kit/pulls/186](#186))
- Validate route responses
- Make paths and target configurable

## 0.0.26

### Patch Changes

- b475ed4: Overhaul adapter API - fixes [https://github.com/sveltejs/kit/pulls/166](#166) ([https://github.com/sveltejs/kit/pulls/180](#180))
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
- a346eab: Copy over latest Sapper router code ([https://github.com/sveltejs/kit/pulls/6](#6))
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
