# @sveltejs/adapter-netlify

## 1.0.0-next.52

### Patch Changes

- Adds support for Netlify Edge Functions ([#4657](https://github.com/sveltejs/kit/pull/4657))

## 1.0.0-next.51

### Patch Changes

- Provide getClientAddress function ([#4289](https://github.com/sveltejs/kit/pull/4289))

## 1.0.0-next.50

### Patch Changes

- [breaking] replace builder.prerender() with builder.writePrerendered() and builder.prerendered ([#4192](https://github.com/sveltejs/kit/pull/4192)) ([#4229](https://github.com/sveltejs/kit/pull/4229))

## 1.0.0-next.49

### Patch Changes

- Add Netlify Functions context as `event.platform.context` ([#4145](https://github.com/sveltejs/kit/pull/4145))

## 1.0.0-next.48

### Patch Changes

- Rename `__fetch_polyfill` to `installFetch` ([#4111](https://github.com/sveltejs/kit/pull/4111))

## 1.0.0-next.47

### Patch Changes

- Fix incorrect set-cookie header handling on adapter-netlify ([#4096](https://github.com/sveltejs/kit/pull/4096))

## 1.0.0-next.46

### Patch Changes

- [breaking] rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))

## 1.0.0-next.45

### Patch Changes

- update to Vite 2.8 and esbuild 0.14 ([#3791](https://github.com/sveltejs/kit/pull/3791))

## 1.0.0-next.44

### Patch Changes

- Fix string replacement in CJS builds ([#3546](https://github.com/sveltejs/kit/pull/3546))

## 1.0.0-next.43

### Patch Changes

- Bump version to trigger rebuild with set-cookie support ([#3529](https://github.com/sveltejs/kit/pull/3529))

## 1.0.0-next.42

### Patch Changes

- Avoid setting the body of the request when the request method is GET or HEAD ([#3459](https://github.com/sveltejs/kit/pull/3459))

## 1.0.0-next.41

### Patch Changes

- Breaking: change app.render signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.40

### Patch Changes

- Polyfill fetch before running any app code ([#3400](https://github.com/sveltejs/kit/pull/3400))

## 1.0.0-next.39

### Patch Changes

- Allow `__fetchPolyfill()` to run several times ([#3377](https://github.com/sveltejs/kit/pull/3377))

## 1.0.0-next.38

### Patch Changes

- Add immutable cache headers to generated assets ([#3222](https://github.com/sveltejs/kit/pull/3222))

## 1.0.0-next.37

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

- Add experimental function splitting ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Don't bundle final output ([#2931](https://github.com/sveltejs/kit/pull/2931))

## 1.0.0-next.36

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.35

### Patch Changes

- [fix] adapter-netlify: handle undefined body ([#2682](https://github.com/sveltejs/kit/pull/2682))

## 1.0.0-next.34

### Patch Changes

- [fix] encode UInt8Array response bodies as base64 ([#2630](https://github.com/sveltejs/kit/pull/2630))

## 1.0.0-next.33

### Patch Changes

- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

## 1.0.0-next.32

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))

## 1.0.0-next.31

### Patch Changes

- [chore] add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.30

### Patch Changes

- [chore] export package.json from adapters ([#2351](https://github.com/sveltejs/kit/pull/2351))

## 1.0.0-next.29

### Patch Changes

- Deploy generated Netlify entrypoint to the internal functions directory. This allows it to co-exist with other Netlify functions. ([#2113](https://github.com/sveltejs/kit/pull/2113))

## 1.0.0-next.28

### Patch Changes

- Ensure the raw body is an Uint8Array before passing it to request handlers ([#2215](https://github.com/sveltejs/kit/pull/2215))

## 1.0.0-next.27

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([#2109](https://github.com/sveltejs/kit/pull/2109))

## 1.0.0-next.26

### Patch Changes

- 4cb4e749: update build output locations ([#2058](https://github.com/sveltejs/kit/pull/2058))
- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))

## 1.0.0-next.25

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition ([#1954](https://github.com/sveltejs/kit/pull/1954))

## 1.0.0-next.24

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration ([#1914](https://github.com/sveltejs/kit/pull/1914))

## 1.0.0-next.23

### Patch Changes

- 67ca3a39: return the correct headers ([#1913](https://github.com/sveltejs/kit/pull/1913))

## 1.0.0-next.22

### Patch Changes

- 9461178: Use multivalue headers to set multiple cookies ([#1906](https://github.com/sveltejs/kit/pull/1906))

## 1.0.0-next.21

### Patch Changes

- 4720b67: Default body parsing to binary ([#1890](https://github.com/sveltejs/kit/pull/1890))

## 1.0.0-next.20

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types ([#1687](https://github.com/sveltejs/kit/pull/1687))

## 1.0.0-next.19

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims ([#1822](https://github.com/sveltejs/kit/pull/1822))

## 1.0.0-next.18

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters ([#1804](https://github.com/sveltejs/kit/pull/1804))

## 1.0.0-next.17

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5 ([#1627](https://github.com/sveltejs/kit/pull/1627))

## 1.0.0-next.16

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([#1621](https://github.com/sveltejs/kit/pull/1621))
- 2636e68: Attempt to fix peerDependencies specification ([#1620](https://github.com/sveltejs/kit/pull/1620))
- 3b988a4: Allow `_redirects` to be placed in root directory ([#1586](https://github.com/sveltejs/kit/pull/1586))

## 1.0.0-next.15

### Patch Changes

- 028abd9: Pass validated svelte config to adapter adapt function ([#1559](https://github.com/sveltejs/kit/pull/1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.14

### Patch Changes

- f59530f: Allow custom redirects for Netlify Adapter
- 71e293d: change toml parser to support dotted keys and other language features added after the TOML v0.4.0 spec ([#1509](https://github.com/sveltejs/kit/pull/1509))
- 1ba1784: Prevent adapter from splitting query params if they contain commas ([#1467](https://github.com/sveltejs/kit/pull/1467))
- dca4946: Make kit a peerDependency of the adapters ([#1505](https://github.com/sveltejs/kit/pull/1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.13

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))
- Updated dependencies [dad93fc]
- Updated dependencies [37fc04f]
  - @sveltejs/kit@1.0.0-next.108

## 1.0.0-next.12

### Patch Changes

- 11e7840: Ensure rawBody is a string or Uint8Array ([#1382](https://github.com/sveltejs/kit/pull/1382))
- Updated dependencies [11e7840]
- Updated dependencies [11e7840]
- Updated dependencies [9e20873]
- Updated dependencies [2562ca0]
  - @sveltejs/kit@1.0.0-next.103

## 1.0.0-next.11

### Patch Changes

- c6fde99: Convert to ESM ([#1323](https://github.com/sveltejs/kit/pull/1323))
- Updated dependencies [694f5de]
- Updated dependencies [0befffb]
- Updated dependencies [c6fde99]
  - @sveltejs/kit@1.0.0-next.97

## 1.0.0-next.10

### Patch Changes

- 2e72a94: Add type declarations ([#1230](https://github.com/sveltejs/kit/pull/1230))
- Updated dependencies [82955ec]
  - @sveltejs/kit@1.0.0-next.91

## 1.0.0-next.9

### Patch Changes

- d3cb858: Convert body to string, unless type is octet-stream ([#1121](https://github.com/sveltejs/kit/pull/1121))
- Updated dependencies [4af45e1]
  - @sveltejs/kit@1.0.0-next.82

## 1.0.0-next.8

### Patch Changes

- 1237eb3: Fix dependencies ([#1109](https://github.com/sveltejs/kit/pull/1109))
- 1237eb3: Pass rawBody from netlify adapter ([#1109](https://github.com/sveltejs/kit/pull/1109))
- Updated dependencies [1237eb3]
- Updated dependencies [1237eb3]
  - @sveltejs/kit@1.0.0-next.81

## 1.0.0-next.7

### Patch Changes

- 0db2cf7: Fix serverless function ([#1102](https://github.com/sveltejs/kit/pull/1102))

## 1.0.0-next.6

### Patch Changes

- 7a4b351: Bundle serverless functions with esbuild ([#1091](https://github.com/sveltejs/kit/pull/1091))

## 1.0.0-next.5

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([#1066](https://github.com/sveltejs/kit/pull/1066))

## 1.0.0-next.4

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([#579](https://github.com/sveltejs/kit/pull/579))

## 1.0.0-next.3

### Patch Changes

- f35a5cd: Change adapter signature ([#505](https://github.com/sveltejs/kit/pull/505))

## 1.0.0-next.2

### Patch Changes

- 512b8c9: adapter-netlify: Use CJS entrypoint ([#485](https://github.com/sveltejs/kit/pull/485))

## 1.0.0-next.1

### Patch Changes

- Fix adapters and convert to ES modules

## 0.0.13

### Patch Changes

- Add svelte-kit start command

## 0.0.12

### Patch Changes

- b475ed4: Overhaul adapter API - fixes #166 ([#180](https://github.com/sveltejs/kit/pull/180))

## 0.0.11

### Patch Changes

- 67eaeea: Move app-utils stuff into subpackages

## 0.0.10

### Patch Changes

- Use setup

## 0.0.9

### Patch Changes

- 0320208: Rename 'server route' to 'endpoint'
- 5ca907c: Use shared mkdirp helper

## 0.0.8

### Patch Changes

- various
