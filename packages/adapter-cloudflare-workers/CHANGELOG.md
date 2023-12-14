# @sveltejs/adapter-cloudflare-workers

## 2.0.0

### Major Changes

- breaking: require SvelteKit 2 ([#11316](https://github.com/sveltejs/kit/pull/11316))

- chore: upgrade esbuild ([#11122](https://github.com/sveltejs/kit/pull/11122))

### Patch Changes

- fix: declare the adapter plugin options as optional ([#11246](https://github.com/sveltejs/kit/pull/11246))

## 1.2.3

### Patch Changes

- fix: correctly map prerendered pages when base path is set ([#11245](https://github.com/sveltejs/kit/pull/11245))

- Updated dependencies [[`bd383f576`](https://github.com/sveltejs/kit/commit/bd383f576592948a2a96b357118cdc7598a8b61c), [`b6a0be712`](https://github.com/sveltejs/kit/commit/b6a0be712644bca4bbd7bec194c1bff682e39d71), [`ded16305b`](https://github.com/sveltejs/kit/commit/ded16305b4c180a697c457ca1b2bec249b4b38fb), [`15422d21d`](https://github.com/sveltejs/kit/commit/15422d21d08a1484f92490da5dd4b77ca7332c23)]:
  - @sveltejs/kit@1.28.0

## 1.2.2

### Patch Changes

- fix: retain URL query string for trailing slash redirects to prerendered pages ([#11142](https://github.com/sveltejs/kit/pull/11142))

- Updated dependencies [[`a7f8bdcfa`](https://github.com/sveltejs/kit/commit/a7f8bdcfabce5cda85dd073a21d0afb6138a7a08), [`a4d91304e`](https://github.com/sveltejs/kit/commit/a4d91304eebc08bf2e748d83a46d3548a546e3ab)]:
  - @sveltejs/kit@1.27.7

## 1.2.1

### Patch Changes

- fix: correctly check url pathnames for trailing slashes ([#10968](https://github.com/sveltejs/kit/pull/10968))

## 1.2.0

### Minor Changes

- feat: add cloudflare's `request.cf` object to the `event.platform` property ([#10873](https://github.com/sveltejs/kit/pull/10873))

## 1.1.4

### Patch Changes

- fix: mark `cloudflare:` packages as external ([#10404](https://github.com/sveltejs/kit/pull/10404))

- Updated dependencies [[`0f0049810`](https://github.com/sveltejs/kit/commit/0f00498100361ef0a4ea8b0b4e8465e442fa22a6), [`6f36aefe1`](https://github.com/sveltejs/kit/commit/6f36aefe13bf55cfaef14166c60ecee989061ddd)]:
  - @sveltejs/kit@1.22.4

## 1.1.3

### Patch Changes

- chore: upgrade to esbuild 0.18.11 ([#10330](https://github.com/sveltejs/kit/pull/10330))

- Updated dependencies [[`23d1df702`](https://github.com/sveltejs/kit/commit/23d1df702f0fd77983040404352d8d83fd1dd8a1), [`486a971fe`](https://github.com/sveltejs/kit/commit/486a971fe7c375aae1585f1fa2505e28f86f4b8e)]:
  - @sveltejs/kit@1.22.2

## 1.1.2

### Patch Changes

- fix: Copy .wasm files during build ([#9940](https://github.com/sveltejs/kit/pull/9940))

- Updated dependencies [[`50acb22ca`](https://github.com/sveltejs/kit/commit/50acb22caf2901283e044cdfda36db6f07b3e0ae), [`2e6da9496`](https://github.com/sveltejs/kit/commit/2e6da9496bdace2c65040b9d1845c44801ca868c), [`a81106b3a`](https://github.com/sveltejs/kit/commit/a81106b3a817829c41e048207d6253e63988c58c), [`a6338a0b1`](https://github.com/sveltejs/kit/commit/a6338a0b124f54bda7ba3fe64be1d6173e118d00), [`4a85b7f08`](https://github.com/sveltejs/kit/commit/4a85b7f0820d35c7830c00afe1df3c94fcbf8c3d), [`26d2b7f8f`](https://github.com/sveltejs/kit/commit/26d2b7f8f5ca29c60ef61b936ff86deaeb1636ce), [`bc70b4e63`](https://github.com/sveltejs/kit/commit/bc70b4e636fcbd9593356996bf737e014ff8c238), [`ab9f57721`](https://github.com/sveltejs/kit/commit/ab9f57721fca146af7c4eb41f4875fafa5dfc0d2)]:
  - @sveltejs/kit@1.17.0

## 1.1.1

### Patch Changes

- chore: update all dependencies with minor version bumps ([#9761](https://github.com/sveltejs/kit/pull/9761))

## 1.1.0

### Minor Changes

- feat: use `es2022` target ([#9293](https://github.com/sveltejs/kit/pull/9293))

### Patch Changes

- Updated dependencies [[`2b647fd8`](https://github.com/sveltejs/kit/commit/2b647fd85be028bc5775894567ee8b13f91411a7), [`fbe4fe76`](https://github.com/sveltejs/kit/commit/fbe4fe768140abac09bd66edd12c77787cafc2c5), [`744dc81c`](https://github.com/sveltejs/kit/commit/744dc81c6b0d8cade087df733c6d3d3f1281e68c)]:
  - @sveltejs/kit@1.10.0

## 1.0.6

### Patch Changes

- feat: expose `App.Platform` interface automatically ([#8531](https://github.com/sveltejs/kit/pull/8531))

- docs: move adapter docs to site ([#8531](https://github.com/sveltejs/kit/pull/8531))

- fix: amend `App.Platform` ([#8531](https://github.com/sveltejs/kit/pull/8531))

## 1.0.5

### Patch Changes

- fix: publish missing files ([#8532](https://github.com/sveltejs/kit/pull/8532))

## 1.0.4

### Patch Changes

- chore: remove superfluous main field from package.json ([#8519](https://github.com/sveltejs/kit/pull/8519))

- Updated dependencies [[`7e2d3405`](https://github.com/sveltejs/kit/commit/7e2d34056e99f371e22406d941b764df365a2649)]:
  - @sveltejs/kit@1.1.1

## 1.0.3

### Patch Changes

- fix: don't load ambient worker types ([#8483](https://github.com/sveltejs/kit/pull/8483))

## 1.0.2

### Patch Changes

- docs: add note about inability to access file system at runtime ([#8441](https://github.com/sveltejs/kit/pull/8441))

- Updated dependencies [[`9c01c32e`](https://github.com/sveltejs/kit/commit/9c01c32ef72bbed630fadcb8283f8f8533ced5e1), [`b6ca02a6`](https://github.com/sveltejs/kit/commit/b6ca02a684dbf13a3138b552e2d2be64697f2254), [`130abe43`](https://github.com/sveltejs/kit/commit/130abe43cef2cfbaf922aa16b20cbd4332a07c15), [`c4137536`](https://github.com/sveltejs/kit/commit/c4137536f2c6572eaeec1a82ccea0852f5be6b98), [`40464efa`](https://github.com/sveltejs/kit/commit/40464efab172a17f0b637d7dadea30d77ef1ed10), [`ce028470`](https://github.com/sveltejs/kit/commit/ce0284708184198efdd30f3ff72fd579cef830b4)]:
  - @sveltejs/kit@1.0.12

## 1.0.1

### Patch Changes

- chore: update @cloudflare/kv-asset-handler ([`30e1130e`](https://github.com/sveltejs/kit/commit/30e1130ef84e56a77be5cb1136d5c53edef6e5f9))
- Updated dependencies [[`fab0de4f`](https://github.com/sveltejs/kit/commit/fab0de4f06ac5b1e9b049e106889b193975c1c29), [`89b8d94b`](https://github.com/sveltejs/kit/commit/89b8d94b1b20d586e1ca525c30d07587c3f2d8f2)]:
  - @sveltejs/kit@1.0.2

## 1.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 1.0.0-next.65

### Patch Changes

- breaking: remove warnings/errors about removed/changed APIs ([#8019](https://github.com/sveltejs/kit/pull/8019))
- Updated dependencies [[`f42604a2`](https://github.com/sveltejs/kit/commit/f42604a2b4c04026d3d8bad95807720b79529539)]:
  - @sveltejs/kit@1.0.0-next.589

## 1.0.0-next.64

### Patch Changes

- chore: add peerDependencies, add more specific next version ([#8141](https://github.com/sveltejs/kit/pull/8141))

## 1.0.0-next.63

### Patch Changes

- fix: revert platform change from browser to neutral ([#8122](https://github.com/sveltejs/kit/pull/8122))

## 1.0.0-next.62

### Patch Changes

- fix: set esbuild platform to neutral ([#8083](https://github.com/sveltejs/kit/pull/8083))

## 1.0.0-next.61

### Patch Changes

- update esbuild to ^0.16.3 ([#7543](https://github.com/sveltejs/kit/pull/7543))

## 1.0.0-next.60

### Patch Changes

- update dependencies ([#7355](https://github.com/sveltejs/kit/pull/7355))

## 1.0.0-next.59

### Patch Changes

- Use config.kit.paths.base prefix for static assets ([#4448](https://github.com/sveltejs/kit/pull/4448))

## 1.0.0-next.58

### Patch Changes

- Add config option to set custom `wrangler.toml` file name ([#7104](https://github.com/sveltejs/kit/pull/7104))

## 1.0.0-next.57

### Patch Changes

- Include ambient.d.ts files in adapter packages. ([#6917](https://github.com/sveltejs/kit/pull/6917))

## 1.0.0-next.56

### Patch Changes

- chore: bump esbuild ([#6829](https://github.com/sveltejs/kit/pull/6829))

## 1.0.0-next.55

### Patch Changes

- Update to esbuild 0.15 ([#6740](https://github.com/sveltejs/kit/pull/6740))

## 1.0.0-next.54

### Patch Changes

- feat: Moved hooks.js initialization from Server.respond into Server.init ([#6179](https://github.com/sveltejs/kit/pull/6179))

## 1.0.0-next.53

### Patch Changes

- expose caches on platform ([#5887](https://github.com/sveltejs/kit/pull/5887))

## 1.0.0-next.52

### Patch Changes

- Initialise `env` ([#5663](https://github.com/sveltejs/kit/pull/5663))

## 1.0.0-next.51

### Patch Changes

- breaking: remove writeStatic to align with Vite ([#5618](https://github.com/sveltejs/kit/pull/5618))

## 1.0.0-next.50

### Patch Changes

- Update dependencies ([#5005](https://github.com/sveltejs/kit/pull/5005))

## 1.0.0-next.49

### Patch Changes

- breaking: Don't pass arbitrary options to esbuild ([#4639](https://github.com/sveltejs/kit/pull/4639))

## 1.0.0-next.48

### Patch Changes

- Expose App interfaces ([#5386](https://github.com/sveltejs/kit/pull/5386))

## 1.0.0-next.47

### Patch Changes

- chore: upgrade TypeScript to 4.7.4 ([#5414](https://github.com/sveltejs/kit/pull/5414))

## 1.0.0-next.46

### Patch Changes

- Generate sourcemaps for server-side functions when bundling with esbuild ([#5258](https://github.com/sveltejs/kit/pull/5258))

## 1.0.0-next.45

### Patch Changes

- Simplify example wrangler.toml, and fix outdated README ([#5187](https://github.com/sveltejs/kit/pull/5187))

## 1.0.0-next.44

### Patch Changes

- Update dependencies ([#5121](https://github.com/sveltejs/kit/pull/5121))

## 1.0.0-next.43

### Patch Changes

- Update adapter entrypoint typings to be NodeNext/ESNext-compatible ([#5111](https://github.com/sveltejs/kit/pull/5111))

## 1.0.0-next.42

### Patch Changes

- only serve `_app/immutable` with immutable cache header, not `_app/version.json` ([#5051](https://github.com/sveltejs/kit/pull/5051))

## 1.0.0-next.41

### Patch Changes

- Add types to pkg.exports ([#5045](https://github.com/sveltejs/kit/pull/5045))

## 1.0.0-next.40

### Patch Changes

- breaking: support Wrangler 2, drop Wrangler 1 ([#4887](https://github.com/sveltejs/kit/pull/4887))

## 1.0.0-next.39

### Patch Changes

- breaking: Remove try-catch around server.respond ([#4738](https://github.com/sveltejs/kit/pull/4738))

## 1.0.0-next.38

### Patch Changes

- - Fix an issue related to prerendered pages incorrectly resolving in @sveltejs/adapter-cloudflare-workers ([#4626](https://github.com/sveltejs/kit/pull/4626))

## 1.0.0-next.37

### Patch Changes

- Breaking: refactor implementation from "Service Worker" pattern to "Module Worker" used in adapter-cloudflare ([#4276](https://github.com/sveltejs/kit/pull/4276))

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

- breaking: replace builder.prerender() with builder.writePrerendered() and builder.prerendered ([#4192](https://github.com/sveltejs/kit/pull/4192)) ([#4229](https://github.com/sveltejs/kit/pull/4229))

## 1.0.0-next.34

### Patch Changes

- breaking: rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))

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
- Remove esbuild options ([#2931](https://github.com/sveltejs/kit/pull/2931))
- Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

## 1.0.0-next.26

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.25

### Patch Changes

- chore: upgrade `@cloudflare/kv-asset-handler` ([#2650](https://github.com/sveltejs/kit/pull/2650))

## 1.0.0-next.24

### Patch Changes

- update dependencies ([#2574](https://github.com/sveltejs/kit/pull/2574))

## 1.0.0-next.23

### Patch Changes

- update to vite 2.6.0 and esbuild 0.13 ([#2522](https://github.com/sveltejs/kit/pull/2522))

## 1.0.0-next.22

### Patch Changes

- chore: add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 1.0.0-next.21

### Patch Changes

- chore: export package.json from adapters ([#2351](https://github.com/sveltejs/kit/pull/2351))

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
