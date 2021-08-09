# @sveltejs/adapter-netlify

## 1.0.0-next.27

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([https://github.com/sveltejs/kit/pulls/2109](#2109))

## 1.0.0-next.26

### Patch Changes

- 4cb4e749: update build output locations ([https://github.com/sveltejs/kit/pulls/2058](#2058))
- d81de603: revert adapters automatically updating .gitignore ([https://github.com/sveltejs/kit/pulls/1924](#1924))

## 1.0.0-next.25

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition ([https://github.com/sveltejs/kit/pulls/1954](#1954))

## 1.0.0-next.24

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration ([https://github.com/sveltejs/kit/pulls/1914](#1914))

## 1.0.0-next.23

### Patch Changes

- 67ca3a39: return the correct headers ([https://github.com/sveltejs/kit/pulls/1913](#1913))

## 1.0.0-next.22

### Patch Changes

- 9461178: Use multivalue headers to set multiple cookies ([https://github.com/sveltejs/kit/pulls/1906](#1906))

## 1.0.0-next.21

### Patch Changes

- 4720b67: Default body parsing to binary ([https://github.com/sveltejs/kit/pulls/1890](#1890))

## 1.0.0-next.20

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types ([https://github.com/sveltejs/kit/pulls/1687](#1687))

## 1.0.0-next.19

### Patch Changes

- 2ac5781: Use esbuild inject API to insert shims ([https://github.com/sveltejs/kit/pulls/1822](#1822))

## 1.0.0-next.18

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters ([https://github.com/sveltejs/kit/pulls/1804](#1804))

## 1.0.0-next.17

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5 ([https://github.com/sveltejs/kit/pulls/1627](#1627))

## 1.0.0-next.16

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([https://github.com/sveltejs/kit/pulls/1621](#1621))
- 2636e68: Attempt to fix peerDependencies specification ([https://github.com/sveltejs/kit/pulls/1620](#1620))
- 3b988a4: Allow `_redirects` to be placed in root directory ([https://github.com/sveltejs/kit/pulls/1586](#1586))

## 1.0.0-next.15

### Patch Changes

- 028abd9: Pass validated svelte config to adapter adapt function ([https://github.com/sveltejs/kit/pulls/1559](#1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.14

### Patch Changes

- f59530f: Allow custom redirects for Netlify Adapter
- 71e293d: change toml parser to support dotted keys and other language features added after the TOML v0.4.0 spec ([https://github.com/sveltejs/kit/pulls/1509](#1509))
- 1ba1784: Prevent adapter from splitting query params if they contain commas ([https://github.com/sveltejs/kit/pulls/1467](#1467))
- dca4946: Make kit a peerDependency of the adapters ([https://github.com/sveltejs/kit/pulls/1505](#1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.13

### Patch Changes

- dad93fc: Fix workspace dependencies ([https://github.com/sveltejs/kit/pulls/1434](#1434))
- Updated dependencies [dad93fc]
- Updated dependencies [37fc04f]
  - @sveltejs/kit@1.0.0-next.108

## 1.0.0-next.12

### Patch Changes

- 11e7840: Ensure rawBody is a string or Uint8Array ([https://github.com/sveltejs/kit/pulls/1382](#1382))
- Updated dependencies [11e7840]
- Updated dependencies [11e7840]
- Updated dependencies [9e20873]
- Updated dependencies [2562ca0]
  - @sveltejs/kit@1.0.0-next.103

## 1.0.0-next.11

### Patch Changes

- c6fde99: Convert to ESM ([https://github.com/sveltejs/kit/pulls/1323](#1323))
- Updated dependencies [694f5de]
- Updated dependencies [0befffb]
- Updated dependencies [c6fde99]
  - @sveltejs/kit@1.0.0-next.97

## 1.0.0-next.10

### Patch Changes

- 2e72a94: Add type declarations ([https://github.com/sveltejs/kit/pulls/1230](#1230))
- Updated dependencies [82955ec]
  - @sveltejs/kit@1.0.0-next.91

## 1.0.0-next.9

### Patch Changes

- d3cb858: Convert body to string, unless type is octet-stream ([https://github.com/sveltejs/kit/pulls/1121](#1121))
- Updated dependencies [4af45e1]
  - @sveltejs/kit@1.0.0-next.82

## 1.0.0-next.8

### Patch Changes

- 1237eb3: Fix dependencies ([https://github.com/sveltejs/kit/pulls/1109](#1109))
- 1237eb3: Pass rawBody from netlify adapter ([https://github.com/sveltejs/kit/pulls/1109](#1109))
- Updated dependencies [1237eb3]
- Updated dependencies [1237eb3]
  - @sveltejs/kit@1.0.0-next.81

## 1.0.0-next.7

### Patch Changes

- 0db2cf7: Fix serverless function ([https://github.com/sveltejs/kit/pulls/1102](#1102))

## 1.0.0-next.6

### Patch Changes

- 7a4b351: Bundle serverless functions with esbuild ([https://github.com/sveltejs/kit/pulls/1091](#1091))

## 1.0.0-next.5

### Patch Changes

- 6e27880: Move server-side fetch to adapters instead of build step ([https://github.com/sveltejs/kit/pulls/1066](#1066))

## 1.0.0-next.4

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([https://github.com/sveltejs/kit/pulls/579](#579))

## 1.0.0-next.3

### Patch Changes

- f35a5cd: Change adapter signature ([https://github.com/sveltejs/kit/pulls/505](#505))

## 1.0.0-next.2

### Patch Changes

- 512b8c9: adapter-netlify: Use CJS entrypoint ([https://github.com/sveltejs/kit/pulls/485](#485))

## 1.0.0-next.1

### Patch Changes

- Fix adapters and convert to ES modules

## 0.0.13

### Patch Changes

- Add svelte-kit start command

## 0.0.12

### Patch Changes

- b475ed4: Overhaul adapter API - fixes [https://github.com/sveltejs/kit/pulls/166](#166) ([https://github.com/sveltejs/kit/pulls/180](#180))

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
