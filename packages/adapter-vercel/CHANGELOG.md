# @sveltejs/adapter-vercel

## 1.0.0-next.26

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition

## 1.0.0-next.25

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration

## 1.0.0-next.24

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims

## 1.0.0-next.23

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters

## 1.0.0-next.22

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5

## 1.0.0-next.21

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug
- 2636e68: Attempt to fix peerDependencies specification

## 1.0.0-next.20

### Patch Changes

- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s)
- 028abd9: Pass validated svelte config to adapter adapt function
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.19

### Patch Changes

- dca4946: Make kit a peerDependency of the adapters
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.18

### Patch Changes

- dad93fc: Fix workspace dependencies
- Updated dependencies [dad93fc]
- Updated dependencies [37fc04f]
  - @sveltejs/kit@1.0.0-next.108

## 1.0.0-next.17

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node
- Updated dependencies [9b448a6]
  - @sveltejs/kit@1.0.0-next.104

## 1.0.0-next.16

### Patch Changes

- c6fde99: Convert to ESM
- Updated dependencies [694f5de]
- Updated dependencies [0befffb]
- Updated dependencies [c6fde99]
  - @sveltejs/kit@1.0.0-next.97

## 1.0.0-next.15

### Patch Changes

- 2e72a94: Add type declarations
- Updated dependencies [82955ec]
  - @sveltejs/kit@1.0.0-next.91

## 1.0.0-next.14

### Patch Changes

- 59f9277: fix body parsing

## 1.0.0-next.13

### Patch Changes

- 1237eb3: Fix dependencies
- 1237eb3: Use getRawBody in adapter-vercel
- Updated dependencies [1237eb3]
- Updated dependencies [1237eb3]
  - @sveltejs/kit@1.0.0-next.81

## 1.0.0-next.12

### Patch Changes

- 7a4b351: Bundle serverless functions with esbuild

## 1.0.0-next.11

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step

## 1.0.0-next.10

### Patch Changes

- feb2db7: Simplify parsing of URLS of incoming requests

## 1.0.0-next.9

### Patch Changes

- ca33a35: Fix adapter-vercel query parsing and update adapter-node's

## 1.0.0-next.8

### Patch Changes

- 8024178: remove @sveltejs/app-utils

## 1.0.0-next.7

### Patch Changes

- 17e82eb: Fix adapter-vercel imports

## 1.0.0-next.6

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs

## 1.0.0-next.5

### Patch Changes

- f35a5cd: Change adapter signature

## 1.0.0-next.4

### Patch Changes

- c3cf3f3: Bump deps
- d742029: Fix mixed usage of CJS and ESM
- Updated dependencies [c3cf3f3]
  - @sveltejs/app-utils@1.0.0-next.3

## 1.0.0-next.3

### Patch Changes

- 8123929: Fix adapter-vercel using the wrong directory
- Updated dependencies [73dd998]
- Updated dependencies [b800049]
  - @sveltejs/app-utils@1.0.0-next.2

## 1.0.0-next.2

### Patch Changes

- Fix adapters and convert to ES modules

## 1.0.0-next.1

### Patch Changes

- Update to new adapter API

## 0.0.3

### Patch Changes

- 67eaeea: Move app-utils stuff into subpackages

## 0.0.2

### Patch Changes

- Use setup

## 0.0.1

### Patch Changes

- 0320208: Rename 'server route' to 'endpoint'
- 5ca907c: Use shared mkdirp helper
