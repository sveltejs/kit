# create-svelte

## 2.0.0-next.77

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([https://github.com/sveltejs/kit/pull/2109](#2109))

## 2.0.0-next.76

### Patch Changes

- b9e63381: Add DOM to lib in tsconfig ([https://github.com/sveltejs/kit/pull/1956](#1956))

## 2.0.0-next.75

### Patch Changes

- fe68e13: Simplify component file names ([https://github.com/sveltejs/kit/pull/1878](#1878))

## 2.0.0-next.74

### Patch Changes

- 4c7ccfd: Add \$lib alias to js/tsconfig ([https://github.com/sveltejs/kit/pull/1860](#1860))

## 2.0.0-next.73

### Patch Changes

- 2d2fab1: Add favicon to skeleton template ([https://github.com/sveltejs/kit/pull/1514](#1514))
- 6aa4988: Replace favicon ([https://github.com/sveltejs/kit/pull/1589](#1589))

## 2.0.0-next.72

### Patch Changes

- 1739443: Add svelte-check to TS templates ([https://github.com/sveltejs/kit/pull/1556](#1556))
- 6372690: gitignore package directory ([https://github.com/sveltejs/kit/pull/1499](#1499))
- f211906: Adjust build-template script to include package.json ([https://github.com/sveltejs/kit/pull/1555](#1555))

## 2.0.0-next.71

### Patch Changes

- dad93fc: Fix workspace dependencies ([https://github.com/sveltejs/kit/pull/1434](#1434))

## 2.0.0-next.70

### Patch Changes

- d871213: Remove Vite dependency from apps ([https://github.com/sveltejs/kit/pull/1374](#1374))

## 2.0.0-next.69

### Patch Changes

- 9cc2508: Ensure template files match Prettier settings ([https://github.com/sveltejs/kit/pull/1364](#1364))
- f5e626d: Reference Vite/Svelte types inside Kit types ([https://github.com/sveltejs/kit/pull/1319](#1319))
- 8a402a9: Exclude deploy artifacts from create-svelte package ([https://github.com/sveltejs/kit/pull/1363](#1363))
- e8bed05: Prompt to npm install before prompting to git init ([https://github.com/sveltejs/kit/pull/1362](#1362))
- 507e2c3: fix: Prettier not formatting .svelte files ([https://github.com/sveltejs/kit/pull/1360](#1360))

## 2.0.0-next.68

### Patch Changes

- 5ed3ed2: Fix usage of request.locals in starter project ([https://github.com/sveltejs/kit/pull/1344](#1344))

## 2.0.0-next.67

### Patch Changes

- d15b48a: Add renamed .svelte -> .svelte-kit directory to ignore files ([https://github.com/sveltejs/kit/pull/1339](#1339))

## 2.0.0-next.66

### Patch Changes

- 1753987: Use request.locals

## 2.0.0-next.65

### Patch Changes

- 0befffb: Rename .svelte to .svelte-kit ([https://github.com/sveltejs/kit/pull/1321](#1321))
- c6fde99: Switch to ESM in config files ([https://github.com/sveltejs/kit/pull/1323](#1323))

## 2.0.0-next.64

### Patch Changes

- 3fb191c: Improved install prompts, turn confirms into toggle ([https://github.com/sveltejs/kit/pull/1312](#1312))

## 2.0.0-next.63

### Patch Changes

- d19f3de: bump minimum required Svelte version ([https://github.com/sveltejs/kit/pull/1192](#1192))

## 2.0.0-next.62

### Patch Changes

- c44f231: Improve a11y on to-do list in template ([https://github.com/sveltejs/kit/pull/1207](#1207))

## 2.0.0-next.61

### Patch Changes

- 82955ec: fix: adapt to svelte ids without ?import in vite 2.2.3

## 2.0.0-next.60

### Patch Changes

- 1b816b2: Update version of eslint-plugin-svelte3 ([https://github.com/sveltejs/kit/pull/1195](#1195))
- 6f2b4a6: Update welcome message ([https://github.com/sveltejs/kit/pull/1196](#1196))
- 6f2b4a6: No adapter by default ([https://github.com/sveltejs/kit/pull/1196](#1196))

## 2.0.0-next.59

### Patch Changes

- a2f3f4b: Rename `start` to `preview` in the CLI and package scripts

## 2.0.0-next.58

### Patch Changes

- 2bf4338: Add .gitignore files to new projects ([https://github.com/sveltejs/kit/pull/1167](#1167))

## 2.0.0-next.57

### Patch Changes

- 4645ad5: Remove obsolete vite.ssr config from template ([https://github.com/sveltejs/kit/pull/1148](#1148))
- 872d734: Hide out-of-view counter from assistive tech ([https://github.com/sveltejs/kit/pull/1150](#1150))

## 2.0.0-next.56

### Patch Changes

- cdf4d5b: Show git init instructions when creating new project
- 112d194: Uppercase method in template ([https://github.com/sveltejs/kit/pull/1119](#1119))

## 2.0.0-next.55

### Patch Changes

- daf6913: Fix bootstrapping command on about page ([https://github.com/sveltejs/kit/pull/1105](#1105))

## 2.0.0-next.54

### Patch Changes

- a84cb88: Fix global.d.ts rename, Windows build issue, missing adapter-node ([https://github.com/sveltejs/kit/pull/1095](#1095))

## 2.0.0-next.53

### Patch Changes

- 27c2e1d: Fix CSS on demo app hero image ([https://github.com/sveltejs/kit/pull/1088](#1088))
- bbeb58f: Include dotfiles when creating new project ([https://github.com/sveltejs/kit/pull/1084](#1084))
- 6a8e73f: Remove large image from create-svelte ([https://github.com/sveltejs/kit/pull/1085](#1085))

## 2.0.0-next.52

### Patch Changes

- f342372: Adding new Hello World templates (default with enhanced style and skeleton) to create-svelte ([https://github.com/sveltejs/kit/pull/1014](#1014))

## 2.0.0-next.51

### Patch Changes

- 4cffc14: add global.d.ts to js version ([https://github.com/sveltejs/kit/pull/1051](#1051))

## 2.0.0-next.50

### Patch Changes

- 3802c64: Fix build so that the package can be automatically published ([https://github.com/sveltejs/kit/pull/1001](#1001))

## 2.0.0-next.49

### Patch Changes

- 3c41d07: Fix preprocess option in template
- 9bb747f: Remove CSS option and simplify ([https://github.com/sveltejs/kit/pull/989](#989))

## 2.0.0-next.48

### Patch Changes

- 4c45784: Add ambient types to published files ([https://github.com/sveltejs/kit/pull/980](#980))

## 2.0.0-next.47

### Patch Changes

- 59a1e06: Add button:focus CSS styles to index page of default app ([https://github.com/sveltejs/kit/pull/957](#957))
- 39b6967: Add ambient type definitions for \$app imports ([https://github.com/sveltejs/kit/pull/917](#917))
- dfbe62b: Add title tag to index page of default app ([https://github.com/sveltejs/kit/pull/954](#954))

## 2.0.0-next.46

### Patch Changes

- 570f90c: Update tsconfig to use module and lib es2020 ([https://github.com/sveltejs/kit/pull/817](#817))
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it ([https://github.com/sveltejs/kit/pull/787](#787))

## 2.0.0-next.45

### Patch Changes

- dac29c5: allow importing JSON modules ([https://github.com/sveltejs/kit/pull/792](#792))
- 8dc89ba: Set target to es2019 in default tsconfig.json ([https://github.com/sveltejs/kit/pull/772](#772))

## 2.0.0-next.44

### Patch Changes

- 7e51473: fix eslint error in ts starter template, add eslint and prettier ignore config
- 7d42f72: Add a global stylesheet during create-svelte depending on the chosen CSS preprocessor ([https://github.com/sveltejs/kit/pull/726](#726))

## 2.0.0-next.43

### Patch Changes

- bdf4ed9: Fix typo in `ignorePatterns` for the `.eslintrc.cjs` generated for TypeScript projects so that `.eslintrc.cjs` correctly ignores itself. ([https://github.com/sveltejs/kit/pull/701](#701))
- f7badf1: Add '\$service-worker' to paths in tsconfig.json ([https://github.com/sveltejs/kit/pull/716](#716))
- 9a664e1: Set `.eslintrc.cjs` to ignore all `.cjs` files. ([https://github.com/sveltejs/kit/pull/707](#707))
- df380e6: Add env options to eslint config ([https://github.com/sveltejs/kit/pull/722](#722))

## 2.0.0-next.42

### Patch Changes

- a52cf82: add eslint and prettier setup options ([https://github.com/sveltejs/kit/pull/632](#632))

## 2.0.0-next.41

### Patch Changes

- 8024178: remove @sveltejs/app-utils ([https://github.com/sveltejs/kit/pull/600](#600))

## 2.0.0-next.40

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([https://github.com/sveltejs/kit/pull/579](#579))

## 2.0.0-next.39

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs ([https://github.com/sveltejs/kit/pull/569](#569))

## 2.0.0-next.38

### Patch Changes

- c04887c: create-svelte: Include globals.d.ts in tsconfig ([https://github.com/sveltejs/kit/pull/549](#549))

## 2.0.0-next.37

### Patch Changes

- c76c9bf: Upgrade Vite ([https://github.com/sveltejs/kit/pull/544](#544))
- ab28c0a: create-svelte: Remove duplicate types ([https://github.com/sveltejs/kit/pull/538](#538))

## 2.0.0-next.36

### Patch Changes

- 0da62eb: create-svelte: Include missing ts-template ([https://github.com/sveltejs/kit/pull/535](#535))

## 2.0.0-next.35

### Patch Changes

- bb01514: Actually fix $component => $lib transition ([https://github.com/sveltejs/kit/pull/529](#529))

## 2.0.0-next.34

### Patch Changes

- 848687c: Fix location of example `Counter.svelte` component ([https://github.com/sveltejs/kit/pull/522](#522))

## 2.0.0-next.33

### Patch Changes

- f7dc6ad: Fix typo in template app
- 5554acc: Add \$lib alias ([https://github.com/sveltejs/kit/pull/511](#511))
- c0ed7a8: create-svelte: globals.d.ts TSDoc fixes, add vite/client types to js/tsconfig ([https://github.com/sveltejs/kit/pull/517](#517))

## 2.0.0-next.32

### Patch Changes

- 97b7ea4: jsconfig for js projects ([https://github.com/sveltejs/kit/pull/510](#510))

## 2.0.0-next.31

### Patch Changes

- c3cf3f3: Bump deps ([https://github.com/sveltejs/kit/pull/492](#492))
- 625747d: create-svelte: bundle production dependencies for SSR ([https://github.com/sveltejs/kit/pull/486](#486))

## 2.0.0-next.30

### Patch Changes

- b800049: Include type declarations ([https://github.com/sveltejs/kit/pull/442](#442))

## 2.0.0-next.29

### Patch Changes

- 15dd6d6: Fix setup to include vite ([https://github.com/sveltejs/kit/pull/415](#415))

## 2.0.0-next.28

### Patch Changes

- Use Vite

## 2.0.0-next.27

### Patch Changes

- Convert everything to ESM

## 2.0.0-next.26

### Patch Changes

- 00cbaf6: Rename _.config.js to _.config.cjs ([https://github.com/sveltejs/kit/pull/356](#356))

## 2.0.0-next.25

### Patch Changes

- c9d8d4f: Render to #svelte by default

## 2.0.0-next.24

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files ([https://github.com/sveltejs/kit/pull/236](#236))

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
- 0904e22: rename svelte CLI to svelte-kit ([https://github.com/sveltejs/kit/pull/186](#186))

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
