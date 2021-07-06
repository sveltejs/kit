# @sveltejs/adapter-node

## 1.0.0-next.32

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims

## 1.0.0-next.31

### Patch Changes

- c639586: Check if '[out]/prerendered' exists, before precompressing

## 1.0.0-next.30

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters

## 1.0.0-next.29

### Patch Changes

- aa5cf15: Fix regression caused by writing `env.js` to the wrong path

## 1.0.0-next.28

### Patch Changes

- 1c8bdba: Allow the environment variables containing the host and port to serve on to be customised

## 1.0.0-next.27

### Patch Changes

- 926481f: precompress assets and prerendered pages (html,js,json,css,svg,xml)
- 318cdd7: Only cache files in config.kit.appDir

## 1.0.0-next.26

### Minor Changes

- 9a7195b: Allow sirv to looks for precompiled gzip and brotli files by default

### Patch Changes

- 53f3322: Fix build when using TypeScript and there is a `tsconfig.json` with `target: 'es2019'` or earlier

## 1.0.0-next.25

### Patch Changes

- 0b780a6: Bundle server-side app during adapt phase

## 1.0.0-next.24

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug
- 2636e68: Attempt to fix peerDependencies specification

## 1.0.0-next.23

### Patch Changes

- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s)
- bf77940: bump `polka` and `sirv` dependency versions
- 028abd9: Pass validated svelte config to adapter adapt function
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.22

### Patch Changes

- dca4946: Make kit a peerDependency of the adapters
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.21

### Patch Changes

- dad93fc: Fix workspace dependencies

## 1.0.0-next.20

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node

## 1.0.0-next.19

### Patch Changes

- 0e09581: Make host configurable via process.env.HOST

## 1.0.0-next.18

### Patch Changes

- c6fde99: Convert to ESM

## 1.0.0-next.17

### Patch Changes

- 2e72a94: Add type declarations

## 1.0.0-next.16

### Patch Changes

- 1237eb3: Use getRawBody

## 1.0.0-next.15

### Patch Changes

- 7a4b351: Use install-fetch helper

## 1.0.0-next.14

### Patch Changes

- 8e61e84: Include missing entrypoint

## 1.0.0-next.13

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step

## 1.0.0-next.12

### Patch Changes

- feb2db7: Fix fatal error when trying to parse URLs of incoming requests

## 1.0.0-next.11

### Patch Changes

- ca33a35: Fix adapter-vercel query parsing and update adapter-node's

## 1.0.0-next.10

### Patch Changes

- 8024178: remove @sveltejs/app-utils

## 1.0.0-next.9

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs

## 1.0.0-next.8

### Patch Changes

- 9212aa5: Add options to adapter-node, and add adapter types

## 1.0.0-next.7

### Patch Changes

- f35a5cd: Change adapter signature

## 1.0.0-next.6

### Patch Changes

- c3cf3f3: Bump deps

## 1.0.0-next.5

### Patch Changes

- 222fe9d: Compress adapter-node responses

## 1.0.0-next.4

### Minor Changes

- Make adapter node work under esm

## 1.0.0-next.3

### Patch Changes

- ab2367d: Convert to ESM

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

- b475ed4: Overhaul adapter API - fixes #166
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
