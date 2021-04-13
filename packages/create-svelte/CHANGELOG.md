# create-svelte

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
