# @sveltejs/kit

## 1.0.0-next.26

### Patch Changes

- Fix svelte-announcer CSS

## 1.0.0-next.25

### Patch Changes

- Surface stack traces for endpoint/page rendering errors

## 1.0.0-next.24

### Patch Changes

- 26643df: Account for config.paths when prerendering

## 1.0.0-next.23

### Patch Changes

- 9b758aa: Upgrade to Snowpack 3

## 1.0.0-next.22

### Patch Changes

- bb68595: use readFileSync instead of createReadStream

## 1.0.0-next.21

### Patch Changes

- 217e4cc: Set paths to empty string before prerender

## 1.0.0-next.20

### Patch Changes

- ccf4aa7: Implement prerender config

## 1.0.0-next.19

### Patch Changes

- deda984: Make navigating store contain from and to properties

## 1.0.0-next.18

### Patch Changes

- c29b61e: Announce page changes
- 72da270: Reset focus properly

## 1.0.0-next.17

### Patch Changes

- f7dea55: Set process.env.NODE_ENV when invoking via the CLI

## 1.0.0-next.16

### Patch Changes

- Remove temporary logging
- Add sveltekit:prefetch and sveltekit:noscroll

## 1.0.0-next.15

### Patch Changes

- 6d1bb11: Fix AMP CSS
- d8b53af: Ignore $layout and $error files when finding static paths
- Better scroll tracking

## 1.0.0-next.14

### Patch Changes

- Fix dev loader

## 1.0.0-next.13

### Patch Changes

- 1ea4d6b: More robust CSS extraction

## 1.0.0-next.12

### Patch Changes

- e7c88dd: Tweak AMP validation screen

## 1.0.0-next.11

### Patch Changes

- a31f218: Fix SSR loader invalidation

## 1.0.0-next.10

### Patch Changes

- 8b14d29: Omit svelte-data scripts from AMP pages

## 1.0.0-next.9

### Patch Changes

- f5fa223: AMP support
- 47f2ee1: Always remove trailing slashes
- 1becb94: Replace preload with load

## 1.0.0-next.8

### Patch Changes

- 15dd751: Use meta http-equiv=refresh
- be7e031: Fix handling of static files
- ed6b8fd: Implement \$app/env

## 1.0.0-next.7

### Patch Changes

- 76705b0: make HMR work outside localhost

## 1.0.0-next.6

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files
- fa7f2b2: Implement live bindings for SSR code

## 1.0.0-next.5

### Patch Changes

- Return dependencies from render

## 1.0.0-next.4

### Patch Changes

- af01b0d: Move renderer out of app assets folder

## 1.0.0-next.3

### Patch Changes

- Add paths to manifest, for static prerendering

## 1.0.0-next.2

### Patch Changes

- Fix typo causing misnamed assets folder

## 1.0.0-next.1

### Patch Changes

- a4bc090: Transform exported functions correctly
- 00bbf98: Fix nested layouts

## 0.0.31-next.0

### Patch Changes

- ffd7bba: Fix SSR cache invalidation

## 0.0.30

### Patch Changes

- Add back stores(), but with deprecation warning
- Rename stores.preloading to stores.navigating
- Rewrite routing logic

## 0.0.29

### Patch Changes

- 10872cc: Normalize request.query

## 0.0.28

### Patch Changes

- Add svelte-kit start command

## 0.0.27

### Patch Changes

- rename CLI to svelte-kit
- 0904e22: rename svelte CLI to svelte-kit
- Validate route responses
- Make paths and target configurable

## 0.0.26

### Patch Changes

- b475ed4: Overhaul adapter API - fixes #166
- Updated dependencies [b475ed4]
  - @sveltejs/app-utils@0.0.18

## 0.0.25

### Patch Changes

- Updated dependencies [3bdf33b]
  - @sveltejs/app-utils@0.0.17

## 0.0.24

### Patch Changes

- 67eaeea: Move app-utils stuff into subpackages
- 7f8df30: Move kit runtime code, expose via \$app aliases
- Updated dependencies [67eaeea]
  - @sveltejs/app-utils@0.0.16

## 0.0.23

### Patch Changes

- a163000: Parse body on incoming requests
- a346eab: Copy over latest Sapper router code
- Updated dependencies [a163000]
  - @sveltejs/app-utils@0.0.15

## 0.0.22

### Patch Changes

- Force bump version

## 0.0.21

### Patch Changes

- Build setup entry point
- Work around pkg.exports constraint
- Respond with 500s if render fails
- Updated dependencies [undefined]
- Updated dependencies [undefined]
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.14

## 0.0.20

### Patch Changes

- Pass setup module to renderer
- Bump Snowpack version
- Updated dependencies [undefined]
- Updated dependencies [96c06d8]
  - @sveltejs/app-utils@0.0.13

## 0.0.19

### Patch Changes

- fa9d7ce: Handle import.meta in SSR module loader
- 0320208: Rename 'server route' to 'endpoint'
- b9444d2: Update to Snowpack 2.15
- 5ca907c: Use shared mkdirp helper
- Updated dependencies [0320208]
- Updated dependencies [5ca907c]
  - @sveltejs/app-utils@0.0.12

## 0.0.18

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.11

## 0.0.17

### Patch Changes

- 19323e9: Update Snowpack
- Updated dependencies [19323e9]
  - @sveltejs/app-utils@0.0.10

## 0.0.16

### Patch Changes

- Updated dependencies [90a98ae]
  - @sveltejs/app-utils@0.0.9

## 0.0.15

### Patch Changes

- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.8

## 0.0.14

### Patch Changes

- various
- Updated dependencies [undefined]
  - @sveltejs/app-utils@0.0.7
