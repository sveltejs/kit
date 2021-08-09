# @sveltejs/adapter-vercel

## 1.0.0-next.27

### Patch Changes

- d81de603: revert adapters automatically updating .gitignore ([https://github.com/sveltejs/kit/pull/1924](#1924))

## 1.0.0-next.26

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition ([https://github.com/sveltejs/kit/pull/1954](#1954))

## 1.0.0-next.25

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration ([https://github.com/sveltejs/kit/pull/1914](#1914))

## 1.0.0-next.24

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims ([https://github.com/sveltejs/kit/pull/1822](#1822))

## 1.0.0-next.23

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters ([https://github.com/sveltejs/kit/pull/1804](#1804))

## 1.0.0-next.22

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5 ([https://github.com/sveltejs/kit/pull/1627](#1627))

## 1.0.0-next.21

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([https://github.com/sveltejs/kit/pull/1621](#1621))
- 2636e68: Attempt to fix peerDependencies specification ([https://github.com/sveltejs/kit/pull/1620](#1620))

## 1.0.0-next.20

### Patch Changes

- c3d36a3: ensure `content-length` limit respected; handle `getRawBody` error(s) ([https://github.com/sveltejs/kit/pull/1528](#1528))
- 028abd9: Pass validated svelte config to adapter adapt function ([https://github.com/sveltejs/kit/pull/1559](#1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.19

### Patch Changes

- dca4946: Make kit a peerDependency of the adapters ([https://github.com/sveltejs/kit/pull/1505](#1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.18

### Patch Changes

- dad93fc: Fix workspace dependencies ([https://github.com/sveltejs/kit/pull/1434](#1434))
- Updated dependencies [dad93fc]
- Updated dependencies [37fc04f]
  - @sveltejs/kit@1.0.0-next.108

## 1.0.0-next.17

### Patch Changes

- 9b448a6: Rename @sveltejs/kit/http to @sveltejs/kit/node ([https://github.com/sveltejs/kit/pull/1391](#1391))
- Updated dependencies [9b448a6]
  - @sveltejs/kit@1.0.0-next.104

## 1.0.0-next.16

### Patch Changes

- c6fde99: Convert to ESM ([https://github.com/sveltejs/kit/pull/1323](#1323))
- Updated dependencies [694f5de]
- Updated dependencies [0befffb]
- Updated dependencies [c6fde99]
  - @sveltejs/kit@1.0.0-next.97

## 1.0.0-next.15

### Patch Changes

- 2e72a94: Add type declarations ([https://github.com/sveltejs/kit/pull/1230](#1230))
- Updated dependencies [82955ec]
  - @sveltejs/kit@1.0.0-next.91

## 1.0.0-next.14

### Patch Changes

- 59f9277: fix body parsing ([https://github.com/sveltejs/kit/pull/1146](#1146))

## 1.0.0-next.13

### Patch Changes

- 1237eb3: Fix dependencies ([https://github.com/sveltejs/kit/pull/1109](#1109))
- 1237eb3: Use getRawBody in adapter-vercel ([https://github.com/sveltejs/kit/pull/1109](#1109))
- Updated dependencies [1237eb3]
- Updated dependencies [1237eb3]
  - @sveltejs/kit@1.0.0-next.81

## 1.0.0-next.12

### Patch Changes

- 7a4b351: Bundle serverless functions with esbuild ([https://github.com/sveltejs/kit/pull/1091](#1091))

## 1.0.0-next.11

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([https://github.com/sveltejs/kit/pull/1066](#1066))

## 1.0.0-next.10

### Patch Changes

- feb2db7: Simplify parsing of URLS of incoming requests ([https://github.com/sveltejs/kit/pull/802](#802))

## 1.0.0-next.9

### Patch Changes

- ca33a35: Fix adapter-vercel query parsing and update adapter-node's ([https://github.com/sveltejs/kit/pull/774](#774))

## 1.0.0-next.8

### Patch Changes

- 8024178: remove @sveltejs/app-utils ([https://github.com/sveltejs/kit/pull/600](#600))

## 1.0.0-next.7

### Patch Changes

- 17e82eb: Fix adapter-vercel imports ([https://github.com/sveltejs/kit/pull/588](#588))

## 1.0.0-next.6

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([https://github.com/sveltejs/kit/pull/579](#579))

## 1.0.0-next.5

### Patch Changes

- f35a5cd: Change adapter signature ([https://github.com/sveltejs/kit/pull/505](#505))

## 1.0.0-next.4

### Patch Changes

- c3cf3f3: Bump deps ([https://github.com/sveltejs/kit/pull/492](#492))
- d742029: Fix mixed usage of CJS and ESM ([https://github.com/sveltejs/kit/pull/483](#483))
- Updated dependencies [c3cf3f3]
  - @sveltejs/app-utils@1.0.0-next.3

## 1.0.0-next.3

### Patch Changes

- 8123929: Fix adapter-vercel using the wrong directory ([https://github.com/sveltejs/kit/pull/450](#450))
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
