# @sveltejs/package

## 2.5.4
### Patch Changes


- fix: resolve more alias issues ([#14514](https://github.com/sveltejs/kit/pull/14514))

## 2.5.3
### Patch Changes


- fix: handle `import/export name, { ... }` when resolving aliases ([#14462](https://github.com/sveltejs/kit/pull/14462))

## 2.5.2
### Patch Changes


- fix: handle `import/export * (as ...)` when resolving aliases ([#14433](https://github.com/sveltejs/kit/pull/14433))


- fix: prevent false-positive alias replacement ([#14433](https://github.com/sveltejs/kit/pull/14433))

## 2.5.1
### Patch Changes


- fix: better alias resolution ([#14413](https://github.com/sveltejs/kit/pull/14413))

## 2.5.0
### Minor Changes


- feat: add `--preserve-output` flag to prevent deletion of the output directory before packaging ([#13055](https://github.com/sveltejs/kit/pull/13055))

## 2.4.1
### Patch Changes


- chore: add `.git` to the end of `package.json` repository url ([#14134](https://github.com/sveltejs/kit/pull/14134))

## 2.4.0
### Minor Changes


- feat: support svelte.config.ts ([#13935](https://github.com/sveltejs/kit/pull/13935))
  
  > **NOTE**
  >
  > Your runtime has to support importing TypeScript files for `svelte.config.ts` to work.
  > In Node.js, the feature is supported with the `--experimental-strip-types` flag starting in Node 22.6.0 and supported without a flag starting in Node 23.6.0.

## 2.3.12
### Patch Changes


- fix: handle non-semver-style dependency versions ([#13925](https://github.com/sveltejs/kit/pull/13925))

## 2.3.11
### Patch Changes


- fix: handle missing package.json gracefully ([#13691](https://github.com/sveltejs/kit/pull/13691))

## 2.3.10
### Patch Changes


- chore: update to chokidar 4.0.3 ([#13381](https://github.com/sveltejs/kit/pull/13381))

## 2.3.9
### Patch Changes


- chore: bump `svelte2tsx` dependency for more up-to-date `d.ts` output ([#8843](https://github.com/sveltejs/kit/pull/8843))


- fix: adjust declaration map paths ([#8843](https://github.com/sveltejs/kit/pull/8843))

## 2.3.8
### Patch Changes


- fix: resolve aliases more robustly ([#13351](https://github.com/sveltejs/kit/pull/13351))

## 2.3.7
### Patch Changes


- docs: update URLs for new svelte.dev site ([#12857](https://github.com/sveltejs/kit/pull/12857))

## 2.3.6
### Patch Changes


- docs: demonstrate sv migrate over prior commands ([#12840](https://github.com/sveltejs/kit/pull/12840))

## 2.3.5
### Patch Changes


- fix: use input tsconfig when calling emitDts ([#12612](https://github.com/sveltejs/kit/pull/12612))


- chore(deps): update dependency chokidar to v4 ([#12671](https://github.com/sveltejs/kit/pull/12671))

## 2.3.4
### Patch Changes


- chore: configure provenance in a simpler manner ([#12570](https://github.com/sveltejs/kit/pull/12570))

## 2.3.3
### Patch Changes


- chore: package provenance ([#12567](https://github.com/sveltejs/kit/pull/12567))

## 2.3.2

### Patch Changes

- chore: add keywords for discovery in npm search ([#12330](https://github.com/sveltejs/kit/pull/12330))

## 2.3.1

### Patch Changes

- fix: don't strip `lang="ts"` tag in Svelte 5 ([#12080](https://github.com/sveltejs/kit/pull/12080))

## 2.3.0

### Minor Changes

- feat: add option to specify the tsconfig/jsconfig ([#11698](https://github.com/sveltejs/kit/pull/11698))

## 2.2.7

### Patch Changes

- chore: update chokidar to 3.6.0 ([#11811](https://github.com/sveltejs/kit/pull/11811))

## 2.2.6

### Patch Changes

- chore: bump svelte2tsx dependency to support generating types for `.svelte.js/ts` files ([#11619](https://github.com/sveltejs/kit/pull/11619))

## 2.2.5

### Patch Changes

- fix: improve warning when encountering import.meta.env ([#11440](https://github.com/sveltejs/kit/pull/11440))

## 2.2.4

### Patch Changes

- chore: update primary branch from master to main ([`47779436c5f6c4d50011d0ef8b2709a07c0fec5d`](https://github.com/sveltejs/kit/commit/47779436c5f6c4d50011d0ef8b2709a07c0fec5d))

## 2.2.3

### Patch Changes

- fix: overwrite nodenext option when transpiling ([#11092](https://github.com/sveltejs/kit/pull/11092))

## 2.2.2

### Patch Changes

- fix: prevent crash on errors in watch mode ([#10628](https://github.com/sveltejs/kit/pull/10628))

## 2.2.1

### Patch Changes

- fix: delay emptying `dist/` folder ([#10514](https://github.com/sveltejs/kit/pull/10514))

## 2.2.0

### Minor Changes

- feat: use Svelte 4 typings when packaging if dependencies allow it ([#10328](https://github.com/sveltejs/kit/pull/10328))

## 2.1.0

### Minor Changes

- feat: support Svelte 4 ([#10225](https://github.com/sveltejs/kit/pull/10225))

## 2.0.2

### Patch Changes

- fix: don't emit false positive export condition warning ([#9109](https://github.com/sveltejs/kit/pull/9109))

## 2.0.1

### Patch Changes

- fix: print version when running `svelte-package --version` ([#9078](https://github.com/sveltejs/kit/pull/9078))

## 2.0.0

### Major Changes

- breaking: remove `package.json` generation and package options from `svelte.config.js`. New default output directory is `dist`. Read the migration guide at https://github.com/sveltejs/kit/pull/8922 to learn how to update ([#8922](https://github.com/sveltejs/kit/pull/8922))

## 1.0.2

### Patch Changes

- chore: update svelte2tsx ([`50a3c5a6`](https://github.com/sveltejs/kit/commit/50a3c5a6d1282c64422e80fe19b352c14e41c853))

## 1.0.1

### Patch Changes

- fix: explicitly mark Node 17.x as not supported ([#8174](https://github.com/sveltejs/kit/pull/8174))

## 1.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 1.0.0-next.6

### Patch Changes

- feat: warn if svelte not found in dependencies or peerDependencies ([#7685](https://github.com/sveltejs/kit/pull/7685))

## 1.0.0-next.5

### Patch Changes

- fix check for undefined on application/ strip ([#6932](https://github.com/sveltejs/kit/pull/6932))

## 1.0.0-next.4

### Patch Changes

- fix: don't strip `type="application/.."` tags ([#6887](https://github.com/sveltejs/kit/pull/6887))

## 1.0.0-next.3

### Patch Changes

- feat: Support aliases set through `kit.alias` ([#6350](https://github.com/sveltejs/kit/pull/6350))

## 1.0.0-next.2

### Patch Changes

- breaking: require Node 16.14 ([#6388](https://github.com/sveltejs/kit/pull/6388))
