# @sveltejs/adapter-cloudflare-workers

## 1.0.0-next.15

### Patch Changes

- 4720b67: Default body parsing to binary

## 1.0.0-next.14

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types

## 1.0.0-next.13

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters

## 1.0.0-next.12

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5

## 1.0.0-next.11

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug
- 2636e68: Attempt to fix peerDependencies specification

## 1.0.0-next.10

### Patch Changes

- 028abd9: Pass validated svelte config to adapter adapt function
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.9

### Patch Changes

- 71e293d: change toml parser to support dotted keys and other language features added after the TOML v0.4.0 spec
- dca4946: Make kit a peerDependency of the adapters
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.8

### Patch Changes

- dad93fc: Fix workspace dependencies

## 1.0.0-next.7

### Patch Changes

- 11e7840: Ensure rawBody is a string or Uint8Array

## 0.0.2-next.6

### Patch Changes

- c6fde99: Convert to ESM

## 0.0.2-next.5

### Patch Changes

- 9e67505: Add es2020 target to esbuild function to solve Unexpected character '#' error

## 0.0.2-next.4

### Patch Changes

- 2e72a94: Add type declarations

## 0.0.2-next.3

### Patch Changes

- b372d61: Generate required package.json

## 0.0.2-next.2

### Patch Changes

- 1237eb3: Pass rawBody to SvelteKit, bundle worker with esbuild

## 0.0.2-next.1

### Patch Changes

- 4325b39: Aligns request/response API of cloudflare-workers adapter with others

## 0.0.2-next.0

### Patch Changes

- e890031: Fix dev/prod deps (oops)
