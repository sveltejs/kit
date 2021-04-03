# @sveltejs/kit

## 1.0.0-next.71

### Patch Changes

- 108c26c: Always return a response from render function in handle

## 1.0.0-next.70

### Patch Changes

- 6d9f7b1: Only include CSS on an SSR'd page
- 6ecfa2c: Remove duplicate <style> element

## 1.0.0-next.69

### Patch Changes

- 4d2cd62: Add prerendering to \$app/env
- e2eeeea: Call load when path changes if page.path is used
- 50b5526: Pass through credentials when fetching in load
- 6384af6: Only inline data if hydrate=true

## 1.0.0-next.68

### Patch Changes

- 24fab19: Add --https flag to dev and start
- ba4f9b7: Check port, only expose to network with --host flag

## 1.0.0-next.67

### Patch Changes

- 679e997: Fix client-side redirect loop detection
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it
- 78aec0c: Detect service worker support
- f33a22c: Make ...rest parameters optional

## 1.0.0-next.66

### Patch Changes

- d9ce2a2: Correct response type for fetch

## 1.0.0-next.65

### Patch Changes

- c0b9873: Always apply layout props when hydrating
- b8a8e53: Add type to config.kit.vite
- 9b09bcc: Prevent XSS when serializing fetch results

## 1.0.0-next.64

### Patch Changes

- 7f58512: Prevent Vite prebundling from crashing on startup

## 1.0.0-next.63

### Patch Changes

- 31f94fe: Add ssr, router and hydrate options

## 1.0.0-next.62

### Patch Changes

- 864c3d4: Assets imported from css and js/ts files are emitted as files instead of being inlined

## 1.0.0-next.61

### Patch Changes

- 4b2c97e: Initialise router with history.state

## 1.0.0-next.60

### Patch Changes

- 84e9023: Fix host property
- 272148b: Rename \$service-worker::assets to files, per the docs
- d5071c5: Hydrate initial page before starting router
- 4a1c04a: More accurate MODULE_NOT_FOUND errors
- d881b7e: Replace setup with hooks

## 1.0.0-next.59

### Patch Changes

- 826f39e: Make prefetching work

## 1.0.0-next.58

### Patch Changes

- 26893b0: Allow first argument to fetch in load to be a request
- 924db15: Add copy function to Builder.js

## 1.0.0-next.57

### Patch Changes

- 391189f: Check for options.initiator in correct place

## 1.0.0-next.56

### Patch Changes

- 82cbe2b: Shrink client manifest
- 8024178: remove @sveltejs/app-utils

## 1.0.0-next.55

### Patch Changes

- d0a7019: switch to @sveltejs/vite-plugin-svelte
- 8a88fad: Replace regex routes with fallthrough routes

## 1.0.0-next.54

### Patch Changes

- 3037530: Create history entry for initial route
- 04f17f5: Prevent erronous <style>undefined</style>
- 8805c6d: Pass adapters directly to svelte.config.cjs

## 1.0.0-next.53

### Patch Changes

- 9cf2f21: Only require page components to export prerender
- e860de0: Invalidate page when query changes
- 7bb1cf0: Disable vite-plugin-svelte transform cache

## 1.0.0-next.52

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs

## 1.0.0-next.51

### Patch Changes

- 34a00f9: Bypass router on hydration

## 1.0.0-next.50

### Patch Changes

- 0512fd1: Remove startGlobal option
- 9212aa5: Add options to adapter-node, and add adapter types
- 0512fd1: Fire custom events for start, and navigation start/end

## 1.0.0-next.49

### Patch Changes

- ab28c0a: kit: include missing types.d.ts
- c76c9bf: Upgrade Vite

## 1.0.0-next.48

### Patch Changes

- e37a302: Make getSession future-proof

## 1.0.0-next.47

### Patch Changes

- 5554acc: Add \$lib alias
- 5cd6f11: bump vite-plugin-svelte to 0.11.0

## 1.0.0-next.46

### Patch Changes

- f35a5cd: Change adapter signature

## 1.0.0-next.45

### Minor Changes

- 925638a: Remove endpoints from the files built for the client

### Patch Changes

- c3cf3f3: Bump deps
- 625747d: kit: bundle @sveltejs/kit into built application
- Updated dependencies [c3cf3f3]
  - @sveltejs/vite-plugin-svelte@1.0.0-next.3

## 1.0.0-next.44

### Patch Changes

- e6449d2: Fix AMP styles for real

## 1.0.0-next.43

### Patch Changes

- 672e9be: Fix AMP styles, again

## 1.0.0-next.42

### Patch Changes

- 0f54ebc: Fix AMP styles

## 1.0.0-next.41

### Patch Changes

- 4aa5a73: Future-proof prepare argument
- 58dc400: Call correct set_paths function
- 2322291: Update to node-fetch@3

## 1.0.0-next.40

### Patch Changes

- 4c5fd3c: Include layout/error styles in SSR

## 1.0.0-next.39

### Patch Changes

- b7fdb0d: Skip pre-bundling

## 1.0.0-next.38

### Patch Changes

- 15402b1: Add service worker support
- 0c630b5: Ignore dynamically imported components when constructing styles in dev mode
- ac06af5: Fix svelte-kit adapt for Windows
- 061fa46: Implement improved redirect API
- b800049: Include type declarations
- 07c6de4: Use posix paths in manifest even on Windows
- 27ba872: Error if preload function exists
- 0c630b5: Add default paths in case singletons module is invalidated
- 73dd998: Allow custom extensions

## 1.0.0-next.37

### Patch Changes

- 230c6d9: Indicate which request failed, if fetch fails inside load function
- f1bc218: Run adapt via svelte-kit build
- 6850ddc: Fix svelte-kit start for Windows

## 1.0.0-next.36

### Patch Changes

- 7b70a33: Force version bump so that Kit uses updated vite-plugin-svelte

## 1.0.0-next.35

### Patch Changes

- Use Vite
- Fix Windows issues
- Preserve load context during navigation
- Return error from load

## 1.0.0-next.34

### Patch Changes

- Fix adapters and convert to ES modules

## 1.0.0-next.33

### Patch Changes

- 474070e: Better errors when modules cannot be found

## 1.0.0-next.32

### Patch Changes

- Convert everything to ESM

## 1.0.0-next.31

### Patch Changes

- b6c2434: app.js -> app.cjs

## 1.0.0-next.30

### Patch Changes

- 00cbaf6: Rename _.config.js to _.config.cjs

## 1.0.0-next.29

### Patch Changes

- 4c0edce: Use addEventListener instead of onload

## 1.0.0-next.28

### Patch Changes

- 4353025: Prevent infinite loop when fetching bad URLs inside error responses
- 2860065: Handle assets path when prerendering

## 1.0.0-next.27

### Patch Changes

- Fail build if prerender errors
- Hide logging behind --verbose option

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
