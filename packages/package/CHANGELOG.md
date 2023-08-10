# @sveltejs/package

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
