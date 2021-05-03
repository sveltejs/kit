# create-svelte

## 2.0.0-next.64

### Patch Changes

- 3fb191c: Improved install prompts, turn confirms into toggle

## 2.0.0-next.63

### Patch Changes

- d19f3de: bump minimum required Svelte version

## 2.0.0-next.62

### Patch Changes

- c44f231: Improve a11y on to-do list in template

## 2.0.0-next.61

### Patch Changes

- 82955ec: fix: adapt to svelte ids without ?import in vite 2.2.3

## 2.0.0-next.60

### Patch Changes

- 1b816b2: Update version of eslint-plugin-svelte3
- 6f2b4a6: Update welcome message
- 6f2b4a6: No adapter by default

## 2.0.0-next.59

### Patch Changes

- a2f3f4b: Rename `start` to `preview` in the CLI and package scripts

## 2.0.0-next.58

### Patch Changes

- 2bf4338: Add .gitignore files to new projects

## 2.0.0-next.57

### Patch Changes

- 4645ad5: Remove obsolete vite.ssr config from template
- 872d734: Hide out-of-view counter from assistive tech

## 2.0.0-next.56

### Patch Changes

- cdf4d5b: Show git init instructions when creating new project
- 112d194: Uppercase method in template

## 2.0.0-next.55

### Patch Changes

- daf6913: Fix bootstrapping command on about page

## 2.0.0-next.54

### Patch Changes

- a84cb88: Fix global.d.ts rename, Windows build issue, missing adapter-node

## 2.0.0-next.53

### Patch Changes

- 27c2e1d: Fix CSS on demo app hero image
- bbeb58f: Include dotfiles when creating new project
- 6a8e73f: Remove large image from create-svelte

## 2.0.0-next.52

### Patch Changes

- f342372: Adding new Hello World templates (default with enhanced style and skeleton) to create-svelte

## 2.0.0-next.51

### Patch Changes

- 4cffc14: add global.d.ts to js version

## 2.0.0-next.50

### Patch Changes

- 3802c64: Fix build so that the package can be automatically published

## 2.0.0-next.49

### Patch Changes

- 3c41d07: Fix preprocess option in template
- 9bb747f: Remove CSS option and simplify

## 2.0.0-next.48

### Patch Changes

- 4c45784: Add ambient types to published files

## 2.0.0-next.47

### Patch Changes

- 59a1e06: Add button:focus CSS styles to index page of default app
- 39b6967: Add ambient type definitions for \$app imports
- dfbe62b: Add title tag to index page of default app

## 2.0.0-next.46

### Patch Changes

- 570f90c: Update tsconfig to use module and lib es2020
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it

## 2.0.0-next.45

### Patch Changes

- dac29c5: allow importing JSON modules
- 8dc89ba: Set target to es2019 in default tsconfig.json

## 2.0.0-next.44

### Patch Changes

- 7e51473: fix eslint error in ts starter template, add eslint and prettier ignore config
- 7d42f72: Add a global stylesheet during create-svelte depending on the chosen CSS preprocessor

## 2.0.0-next.43

### Patch Changes

- bdf4ed9: Fix typo in `ignorePatterns` for the `.eslintrc.cjs` generated for TypeScript projects so that `.eslintrc.cjs` correctly ignores itself.
- f7badf1: Add '\$service-worker' to paths in tsconfig.json
- 9a664e1: Set `.eslintrc.cjs` to ignore all `.cjs` files.
- df380e6: Add env options to eslint config

## 2.0.0-next.42

### Patch Changes

- a52cf82: add eslint and prettier setup options

## 2.0.0-next.41

### Patch Changes

- 8024178: remove @sveltejs/app-utils

## 2.0.0-next.40

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs

## 2.0.0-next.39

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs

## 2.0.0-next.38

### Patch Changes

- c04887c: create-svelte: Include globals.d.ts in tsconfig

## 2.0.0-next.37

### Patch Changes

- c76c9bf: Upgrade Vite
- ab28c0a: create-svelte: Remove duplicate types

## 2.0.0-next.36

### Patch Changes

- 0da62eb: create-svelte: Include missing ts-template

## 2.0.0-next.35

### Patch Changes

- bb01514: Actually fix $component => $lib transition

## 2.0.0-next.34

### Patch Changes

- 848687c: Fix location of example `Counter.svelte` component

## 2.0.0-next.33

### Patch Changes

- f7dc6ad: Fix typo in template app
- 5554acc: Add \$lib alias
- c0ed7a8: create-svelte: globals.d.ts TSDoc fixes, add vite/client types to js/tsconfig

## 2.0.0-next.32

### Patch Changes

- 97b7ea4: jsconfig for js projects

## 2.0.0-next.31

### Patch Changes

- c3cf3f3: Bump deps
- 625747d: create-svelte: bundle production dependencies for SSR

## 2.0.0-next.30

### Patch Changes

- b800049: Include type declarations

## 2.0.0-next.29

### Patch Changes

- 15dd6d6: Fix setup to include vite

## 2.0.0-next.28

### Patch Changes

- Use Vite

## 2.0.0-next.27

### Patch Changes

- Convert everything to ESM

## 2.0.0-next.26

### Patch Changes

- 00cbaf6: Rename _.config.js to _.config.cjs

## 2.0.0-next.25

### Patch Changes

- c9d8d4f: Render to #svelte by default

## 2.0.0-next.24

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files

## 2.0.0-next.23

### Patch Changes

- Use next tag for all packages

## 2.0.0-next.22

### Patch Changes

- Bump kit version

## 2.0.0-next.21

### Patch Changes

- Show create-svelte version when starting a new project

## 2.0.0-alpha.19

### Patch Changes

- Add svelte-kit start command

## 2.0.0-alpha.18

### Patch Changes

- rename CLI to svelte-kit
- 0904e22: rename svelte CLI to svelte-kit

## 2.0.0-alpha.16

### Patch Changes

- 5fbc475: Add TypeScript support at project init

## 2.0.0-alpha.14-15

### Patch Changes

- Add 'here be dragons' warning

## 2.0.0-alpha.13

### Patch Changes

- d936573: Give newly created app a name based on current directory
- 5ca907c: Use shared mkdirp helper
