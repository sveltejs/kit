# @sveltejs/adapter-node

## 1.0.0-next.68

### Patch Changes

- `precompress` option also compress wasm files ([#3812](https://github.com/sveltejs/kit/pull/3812))

## 1.0.0-next.67

### Patch Changes

- Bump version to trigger rebuild with set-cookie support ([#3529](https://github.com/sveltejs/kit/pull/3529))

## 1.0.0-next.66

### Patch Changes

- fix usage of `ORIGIN` environment variable ([#3448](https://github.com/sveltejs/kit/pull/3448))

## 1.0.0-next.65

### Patch Changes

- [fix] rename `BASE` to `ORIGIN` and fix config handling ([#3423](https://github.com/sveltejs/kit/pull/3423))

## 1.0.0-next.64

### Patch Changes

- Breaking: change app.render signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))

* Breaking: Remove protocol/host configuration options from Kit to adapter-node ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.63

### Patch Changes

- Polyfill fetch before running any app code ([#3400](https://github.com/sveltejs/kit/pull/3400))

## 1.0.0-next.62

### Patch Changes

- Allow `__fetchPolyfill()` to run several times ([#3377](https://github.com/sveltejs/kit/pull/3377))

## 1.0.0-next.61

### Patch Changes

- [chore] update dependency sirv to v2 ([#3263](https://github.com/sveltejs/kit/pull/3263))

## 1.0.0-next.60

### Patch Changes

- Don't cache non-hashed static assets in adapter-node ([#3193](https://github.com/sveltejs/kit/pull/3193))

* Only set cache-control: immutable when appropriate ([#3196](https://github.com/sveltejs/kit/pull/3196))

## 1.0.0-next.59

### Patch Changes

- Fix types ([#3181](https://github.com/sveltejs/kit/pull/3181))

* Check if directory exists, before compressing ([#3179](https://github.com/sveltejs/kit/pull/3179))

## 1.0.0-next.58

### Patch Changes

- [fix] only add handlers for directories that exist ([#3148](https://github.com/sveltejs/kit/pull/3148))

## 1.0.0-next.57

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

- Don't bundle final output ([#2931](https://github.com/sveltejs/kit/pull/2931))

## 1.0.0-next.56

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.55

### Patch Changes

- [breaking] drop Node 12 support ([#2604](https://github.com/sveltejs/kit/pull/2604))

## 1.0.0-next.54

### Patch Changes

- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

## 1.0.0-next.53

### Patch Changes

- Don't crash when receiving malformed URLs ([#2533](https://github.com/sveltejs/kit/pull/2533))

## 1.0.0-next.52

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))

## 1.0.0-next.51

### Patch Changes

- [fix] regression where builds not using `entryPoint` stopped having `middlewares.js` external ([#2484](https://github.com/sveltejs/kit/pull/2484))

## 1.0.0-next.50

### Patch Changes

- [fix] Correctly treat `middlewares.js` as external when using `entryPoint` option ([#2482](https://github.com/sveltejs/kit/pull/2482))

## 1.0.0-next.49

### Patch Changes

- update dependencies ([#2447](https://github.com/sveltejs/kit/pull/2447))

## 1.0.0-next.48

### Patch Changes

- [chore] add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.47

### Patch Changes

- [feat] add entryPoint option for custom servers ([#2414](https://github.com/sveltejs/kit/pull/2414))

## 1.0.0-next.46

### Patch Changes

- Clear output directory before adapting ([#2388](https://github.com/sveltejs/kit/pull/2388))

## 1.0.0-next.45

### Patch Changes

- [chore] export package.json from adapters ([#2351](https://github.com/sveltejs/kit/pull/2351))

## 1.0.0-next.44

### Patch Changes

- [feat] expose handler to allow use in custom server

## 1.0.0-next.43

### Patch Changes

- [fix] provide default port only if path not provided ([#2244](https://github.com/sveltejs/kit/pull/2244))

## 1.0.0-next.42

### Patch Changes

- [fix] bump polka and sirv again to address unicode handling bug

## 1.0.0-next.41

### Patch Changes

- [fix] upgrade polka and sirv. fixes handling of URLs with unicode characters ([#2191](https://github.com/sveltejs/kit/pull/2191))

## 1.0.0-next.40

### Patch Changes

- [fix] handle paths consistently between dev and various production adapters ([#2171](https://github.com/sveltejs/kit/pull/2171))

* [feat] allow node adapter to configure listen path ([#2048](https://github.com/sveltejs/kit/pull/2048))

## 1.0.0-next.39

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([#2109](https://github.com/sveltejs/kit/pull/2109))

## 1.0.0-next.38

### Patch Changes

- a12beb04: [fix] update broken file path ([#2096](https://github.com/sveltejs/kit/pull/2096))

## 1.0.0-next.37

### Patch Changes

- b3e7c8b3: [chore] update build output location ([#2082](https://github.com/sveltejs/kit/pull/2082))

## 1.0.0-next.36

### Patch Changes

- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))

## 1.0.0-next.35

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition ([#1954](https://github.com/sveltejs/kit/pull/1954))

## 1.0.0-next.34

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration ([#1914](https://github.com/sveltejs/kit/pull/1914))

## 1.0.0-next.33

### Patch Changes

- 463199c: Handle Uint8Array bodies from endpoints ([#1875](https://github.com/sveltejs/kit/pull/1875))
- 0db0889: log both host and port ([#1877](https://github.com/sveltejs/kit/pull/1877))

## 1.0.0-next.32

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims ([#1822](https://github.com/sveltejs/kit/pull/1822))

## 1.0.0-next.31

### Patch Changes

- c639586: Check if '[out]/prerendered' exists, before precompressing ([#1806](https://github.com/sveltejs/kit/pull/1806))

## 1.0.0-next.30

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters ([#1804](https://github.com/sveltejs/kit/pull/1804))

## 1.0.0-next.29

### Patch Changes

- aa5cf15: Fix regression caused by writing `env.js` to the wrong path ([#1756](https://github.com/sveltejs/kit/pull/1756))

## 1.0.0-next.28

### Patch Changes

- 1c8bdba: Allow the environment variables containing the host and port to serve on to be customised ([#1754](https://github.com/sveltejs/kit/pull/1754))

## 1.0.0-next.27

### Patch Changes

- 926481f: precompress assets and prerendered pages (html,js,json,css,svg,xml) ([#1693](https://github.com/sveltejs/kit/pull/1693))
- 318cdd7: Only cache files in config.kit.appDir ([#1416](https://github.com/sveltejs/kit/pull/1416))

## 1.0.0-next.26

### Patch Changes

- 9a7195b: Allow sirv to looks for precompiled gzip and brotli files by default ([#1672](https://github.com/sveltejs/kit/pull/1672))
- 53f3322: Fix build when using TypeScript and there is a `tsconfig.json` with `target: 'es2019'` or earlier ([#1675](https://github.com/sveltejs/kit/pull/1675))

## 1.0.0-next.25

### Patch Changes

- 0b780a6: Bundle server-side app during adapt phase ([#1648](https://github.com/sveltejs/kit/pull/1648))

## 1.0.0-next.24

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([#1621](https://github.com/sveltejs/kit/pull/1621))
- 2636e68: Attempt to fix peerDependencies specification ([#1620](https://github.com/sveltejs/kit/pull/1620))

## 1.0.0-next.23

### Patch Changes

- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s) ([#1528](https://github.com/sveltejs/kit/pull/1528))
- bf77940: bump `polka` and `sirv` dependency versions ([#1548](https://github.com/sveltejs/kit/pull/1548))
- 028abd9: Pass validated svelte config to adapter adapt function ([#1559](https://github.com/sveltejs/kit/pull/1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.22

### Patch Changes

- dca4946: Make kit a peerDependency of the adapters ([#1505](https://github.com/sveltejs/kit/pull/1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.21

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))

## 1.0.0-next.20

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node ([#1391](https://github.com/sveltejs/kit/pull/1391))

## 1.0.0-next.19

### Patch Changes

- 0e09581: Make host configurable via process.env.HOST ([#1366](https://github.com/sveltejs/kit/pull/1366))

## 1.0.0-next.18

### Patch Changes

- c6fde99: Convert to ESM ([#1323](https://github.com/sveltejs/kit/pull/1323))

## 1.0.0-next.17

### Patch Changes

- 2e72a94: Add type declarations ([#1230](https://github.com/sveltejs/kit/pull/1230))

## 1.0.0-next.16

### Patch Changes

- 1237eb3: Use getRawBody ([#1109](https://github.com/sveltejs/kit/pull/1109))

## 1.0.0-next.15

### Patch Changes

- 7a4b351: Use install-fetch helper ([#1091](https://github.com/sveltejs/kit/pull/1091))

## 1.0.0-next.14

### Patch Changes

- 8e61e84: Include missing entrypoint ([#1071](https://github.com/sveltejs/kit/pull/1071))

## 1.0.0-next.13

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([#1066](https://github.com/sveltejs/kit/pull/1066))

## 1.0.0-next.12

### Patch Changes

- feb2db7: Fix fatal error when trying to parse URLs of incoming requests ([#802](https://github.com/sveltejs/kit/pull/802))

## 1.0.0-next.11

### Patch Changes

- ca33a35: Fix adapter-vercel query parsing and update adapter-node's ([#774](https://github.com/sveltejs/kit/pull/774))

## 1.0.0-next.10

### Patch Changes

- 8024178: remove @sveltejs/app-utils ([#600](https://github.com/sveltejs/kit/pull/600))

## 1.0.0-next.9

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([#579](https://github.com/sveltejs/kit/pull/579))

## 1.0.0-next.8

### Patch Changes

- 9212aa5: Add options to adapter-node, and add adapter types ([#531](https://github.com/sveltejs/kit/pull/531))

## 1.0.0-next.7

### Patch Changes

- f35a5cd: Change adapter signature ([#505](https://github.com/sveltejs/kit/pull/505))

## 1.0.0-next.6

### Patch Changes

- c3cf3f3: Bump deps ([#492](https://github.com/sveltejs/kit/pull/492))

## 1.0.0-next.5

### Patch Changes

- 222fe9d: Compress adapter-node responses ([#367](https://github.com/sveltejs/kit/pull/367))

## 1.0.0-next.4

### Patch Changes

- Make adapter node work under esm

## 1.0.0-next.3

### Patch Changes

- ab2367d: Convert to ESM ([#387](https://github.com/sveltejs/kit/pull/387))

## 1.0.0-next.2

### Patch Changes

- Fix adapters and convert to ES modules

## 1.0.0-next.1

### Patch Changes

- 13e8fa3: Make adapter-node work

## 0.0.18

### Patch Changes

- b3ac507: Add missing pkg.files

## 0.0.17

### Patch Changes

- Add svelte-kit start command

## 0.0.16

### Patch Changes

- Make paths and target configurable

## 0.0.15

### Patch Changes

- b475ed4: Overhaul adapter API - fixes #166 ([#180](https://github.com/sveltejs/kit/pull/180))
- Updated dependencies [b475ed4]
  - @sveltejs/app-utils@0.0.18

## 0.0.14

### Patch Changes

- Updated dependencies [3bdf33b]
  - @sveltejs/app-utils@0.0.17

## 0.0.13

### Patch Changes

- 67eaeea: Move app-utils stuff into subpackages
- Updated dependencies [67eaeea]
  - @sveltejs/app-utils@0.0.16

## 0.0.12

### Patch Changes

- a163000: Parse body on incoming requests
- Updated dependencies [a163000]
  - @sveltejs/app-utils@0.0.15

## 0.0.11

### Patch Changes

- Use setup module
- Updated dependencies [undefined]
- Updated dependencies [undefined]
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.14

## 0.0.10

### Patch Changes

- Updated dependencies [undefined]
- Updated dependencies [96c06d8]
  - @sveltejs/app-utils@0.0.13

## 0.0.9

### Patch Changes

- 0320208: Rename 'server route' to 'endpoint'
- 026acd2: Accommodate missing build/prerendered directory
- 8b63057: Let sirv add must-revalidate
- Updated dependencies [0320208]
- Updated dependencies [5ca907c]
  - @sveltejs/app-utils@0.0.12

## 0.0.8

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.11

## 0.0.7

### Patch Changes

- 19323e9: Fix prerendering
- Updated dependencies [19323e9]
  - @sveltejs/app-utils@0.0.10

## 0.0.6

### Patch Changes

- Updated dependencies [90a98ae]
  - @sveltejs/app-utils@0.0.9

## 0.0.5

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.8

## 0.0.4

### Patch Changes

- various
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.7
