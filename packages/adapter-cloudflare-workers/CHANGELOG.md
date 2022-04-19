# @sveltejs/adapter-cloudflare-workers

## 1.0.0-next.38

### Patch Changes

- - Fix an issue related to prerendered pages incorrectly resolving in @sveltejs/adapter-cloudflare-workers ([#4626](https://github.com/sveltejs/kit/pull/4626))

## 1.0.0-next.37

### Patch Changes

- [Breaking] refactor implementation from "Service Worker" pattern to "Module Worker" used in adapter-cloudflare ([#4276](https://github.com/sveltejs/kit/pull/4276))

  #### add the following to your wrangler.toml

  ```toml
  		[build.upload]
  		format = "modules"
  		main = "./worker.mjs"
  ```

## 1.0.0-next.36

### Patch Changes

- Provide getClientAddress function ([#4289](https://github.com/sveltejs/kit/pull/4289))

## 1.0.0-next.35

### Patch Changes

- [breaking] replace builder.prerender() with builder.writePrerendered() and builder.prerendered ([#4192](https://github.com/sveltejs/kit/pull/4192)) ([#4229](https://github.com/sveltejs/kit/pull/4229))

## 1.0.0-next.34

### Patch Changes

- [breaking] rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))

## 1.0.0-next.33

### Patch Changes

- revert change to Cloudflare ES target version ([#3847](https://github.com/sveltejs/kit/pull/3847))

## 1.0.0-next.32

### Patch Changes

- Fix Cloudflare adapter targets ([#3827](https://github.com/sveltejs/kit/pull/3827))

## 1.0.0-next.31

### Patch Changes

- update to Vite 2.8 and esbuild 0.14 ([#3791](https://github.com/sveltejs/kit/pull/3791))

## 1.0.0-next.30

### Patch Changes

- Breaking: change app.render signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.29

### Patch Changes

- Add immutable cache headers to generated assets ([#3222](https://github.com/sveltejs/kit/pull/3222))

## 1.0.0-next.28

### Patch Changes

- use path/posix to resolve relative paths for esmodules ([#3212](https://github.com/sveltejs/kit/pull/3212))

## 1.0.0-next.27

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Remove esbuild options ([#2931](https://github.com/sveltejs/kit/pull/2931))

- Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

## 1.0.0-next.26

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.25

### Patch Changes

- [chore] upgrade `@cloudflare/kv-asset-handler` ([#2650](https://github.com/sveltejs/kit/pull/2650))

## 1.0.0-next.24

### Patch Changes

- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

## 1.0.0-next.23

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))

## 1.0.0-next.22

### Patch Changes

- [chore] add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.21

### Patch Changes

- [chore] export package.json from adapters ([#2351](https://github.com/sveltejs/kit/pull/2351))

## 1.0.0-next.20

### Patch Changes

- Support assigning multiple values to a header ([#2313](https://github.com/sveltejs/kit/pull/2313))

## 1.0.0-next.19

### Patch Changes

- Ensure the raw body is an Uint8Array before passing it to request handlers ([#2215](https://github.com/sveltejs/kit/pull/2215))

## 1.0.0-next.18

### Patch Changes

- d81de603: revert adapters automatically updating .gitignore ([#1924](https://github.com/sveltejs/kit/pull/1924))

## 1.0.0-next.17

### Patch Changes

- e9f78999: fix: include esbuild config in adapter type definition ([#1954](https://github.com/sveltejs/kit/pull/1954))

## 1.0.0-next.16

### Patch Changes

- e6995797: feat(adapters): expose esbuild configuration ([#1914](https://github.com/sveltejs/kit/pull/1914))

## 1.0.0-next.15

### Patch Changes

- 4720b67: Default body parsing to binary ([#1890](https://github.com/sveltejs/kit/pull/1890))

## 1.0.0-next.14

### Patch Changes

- 7faf52f: Update and consolidate checks for binary body types ([#1687](https://github.com/sveltejs/kit/pull/1687))

## 1.0.0-next.13

### Patch Changes

- 9f0c54a: Externalize app initialization to adapters ([#1804](https://github.com/sveltejs/kit/pull/1804))

## 1.0.0-next.12

### Patch Changes

- c51ab7d: Upgrade esbuild to ^0.12.5 ([#1627](https://github.com/sveltejs/kit/pull/1627))

## 1.0.0-next.11

### Patch Changes

- edc307d: Remove peerDependencies due to pnpm bug ([#1621](https://github.com/sveltejs/kit/pull/1621))
- 2636e68: Attempt to fix peerDependencies specification ([#1620](https://github.com/sveltejs/kit/pull/1620))

## 1.0.0-next.10

### Patch Changes

- 028abd9: Pass validated svelte config to adapter adapt function ([#1559](https://github.com/sveltejs/kit/pull/1559))
- Updated dependencies [6372690]
- Updated dependencies [c3d36a3]
- Updated dependencies [bf77940]
- Updated dependencies [2172469]
- Updated dependencies [028abd9]
  - @sveltejs/kit@1.0.0-next.110

## 1.0.0-next.9

### Patch Changes

- 71e293d: change toml parser to support dotted keys and other language features added after the TOML v0.4.0 spec ([#1509](https://github.com/sveltejs/kit/pull/1509))
- dca4946: Make kit a peerDependency of the adapters ([#1505](https://github.com/sveltejs/kit/pull/1505))
- Updated dependencies [261ee1c]
- Updated dependencies [ec156c6]
- Updated dependencies [586785d]
  - @sveltejs/kit@1.0.0-next.109

## 1.0.0-next.8

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))

## 1.0.0-next.7

### Patch Changes

- 11e7840: Ensure rawBody is a string or Uint8Array ([#1382](https://github.com/sveltejs/kit/pull/1382))

## 0.0.2-next.6

### Patch Changes

- c6fde99: Convert to ESM ([#1323](https://github.com/sveltejs/kit/pull/1323))

## 0.0.2-next.5

### Patch Changes

- 9e67505: Add es2020 target to esbuild function to solve Unexpected character '#' error ([#1287](https://github.com/sveltejs/kit/pull/1287))

## 0.0.2-next.4

### Patch Changes

- 2e72a94: Add type declarations ([#1230](https://github.com/sveltejs/kit/pull/1230))

## 0.0.2-next.3

### Patch Changes

- b372d61: Generate required package.json ([#1116](https://github.com/sveltejs/kit/pull/1116))

## 0.0.2-next.2

### Patch Changes

- 1237eb3: Pass rawBody to SvelteKit, bundle worker with esbuild ([#1109](https://github.com/sveltejs/kit/pull/1109))

## 0.0.2-next.1

### Patch Changes

- 4325b39: Aligns request/response API of cloudflare-workers adapter with others ([#946](https://github.com/sveltejs/kit/pull/946))

## 0.0.2-next.0

### Patch Changes

- e890031: Fix dev/prod deps (oops) ([#749](https://github.com/sveltejs/kit/pull/749))
