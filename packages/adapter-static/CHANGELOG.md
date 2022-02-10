# @sveltejs/adapter-static

## 1.0.0-next.28

### Patch Changes

- [breaking] remove `createIndexFiles` option, derive from `trailingSlash` instead ([#3801](https://github.com/sveltejs/kit/pull/3801))

## 1.0.0-next.27

### Patch Changes

- `precompress` option also compress wasm files ([#3790](https://github.com/sveltejs/kit/pull/3790))

## 1.0.0-next.26

### Patch Changes

- Log adapter-static output directories ([#3274](https://github.com/sveltejs/kit/pull/3274))

## 1.0.0-next.25

### Patch Changes

- [chore] update dependency sirv to v2 ([#3263](https://github.com/sveltejs/kit/pull/3263))

## 1.0.0-next.24

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

## 1.0.0-next.23

### Patch Changes

- add precompress option to adapter-static ([#3079](https://github.com/sveltejs/kit/pull/3079))

## 1.0.0-next.22

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.21

### Patch Changes

- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

## 1.0.0-next.20

### Patch Changes

- [chore] upgrade to Svelte 3.43.0" ([#2474](https://github.com/sveltejs/kit/pull/2474))

## 1.0.0-next.19

### Patch Changes

- [chore] add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.18

### Patch Changes

- [chore] export package.json from adapters ([#2351](https://github.com/sveltejs/kit/pull/2351))

## 1.0.0-next.17

### Patch Changes

- Clear output before adapting ([#2260](https://github.com/sveltejs/kit/pull/2260))

## 1.0.0-next.16

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([#2109](https://github.com/sveltejs/kit/pull/2109))

## 1.0.0-next.15

### Patch Changes

- b3e7c8b3: [chore] update build output location ([#2082](https://github.com/sveltejs/kit/pull/2082))

## 1.0.0-next.14

### Patch Changes

- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))

## 1.0.0-next.13

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([#1621](https://github.com/sveltejs/kit/pull/1621))
- 2636e68: Attempt to fix peerDependencies specification ([#1620](https://github.com/sveltejs/kit/pull/1620))

## 1.0.0-next.12

### Patch Changes

- bf77940: bump `polka` and `sirv` dependency versions ([#1548](https://github.com/sveltejs/kit/pull/1548))
- 028abd9: Pass validated svelte config to adapter adapt function ([#1559](https://github.com/sveltejs/kit/pull/1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.11

### Patch Changes

- dca4946: Make kit a peerDependency of the adapters ([#1505](https://github.com/sveltejs/kit/pull/1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.10

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))

## 1.0.0-next.9

### Patch Changes

- d871213: Remove Vite dependency from apps ([#1374](https://github.com/sveltejs/kit/pull/1374))

## 1.0.0-next.8

### Patch Changes

- c6fde99: Convert to ESM ([#1323](https://github.com/sveltejs/kit/pull/1323))

## 1.0.0-next.7

### Patch Changes

- 2e72a94: Add type declarations ([#1230](https://github.com/sveltejs/kit/pull/1230))

## 1.0.0-next.6

### Patch Changes

- 6f2b4a6: Remove references to npm start ([#1196](https://github.com/sveltejs/kit/pull/1196))

## 1.0.0-next.5

### Patch Changes

- 4131467: Prerender fallback page for SPAs ([#1181](https://github.com/sveltejs/kit/pull/1181))

## 1.0.0-next.4

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([#579](https://github.com/sveltejs/kit/pull/579))

## 1.0.0-next.3

### Patch Changes

- f35a5cd: Change adapter signature ([#505](https://github.com/sveltejs/kit/pull/505))

## 1.0.0-next.2

### Patch Changes

- Fix adapters and convert to ES modules

## 1.0.0-next.1

### Patch Changes

- Support options

## 0.0.17

### Patch Changes

- Add svelte-kit start command

## 0.0.16

### Patch Changes

- Remove unnecessary prepublish script

## 0.0.15

### Patch Changes

- b475ed4: Overhaul adapter API - fixes #166 ([#180](https://github.com/sveltejs/kit/pull/180))

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

- Updated dependencies [a163000]
  - @sveltejs/app-utils@0.0.15

## 0.0.11

### Patch Changes

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

- Updated dependencies [0320208]
- Updated dependencies [5ca907c]
  - @sveltejs/app-utils@0.0.12

## 0.0.8

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.11

## 0.0.7

### Patch Changes

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
