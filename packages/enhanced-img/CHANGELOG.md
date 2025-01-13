# @sveltejs/enhanced-img

## 0.4.4
### Patch Changes


- fix: handle duplicate SVG images ([`8073d7c7dcc391d406c658729221a18ac6f18102`](https://github.com/sveltejs/kit/commit/8073d7c7dcc391d406c658729221a18ac6f18102))

## 0.4.3
### Patch Changes


- fix: properly handle multiple SVGs ([#13127](https://github.com/sveltejs/kit/pull/13127))

## 0.4.2
### Patch Changes


- feat: set intrinsic width and height for SVGs ([#13126](https://github.com/sveltejs/kit/pull/13126))


- perf: directly inline values since Svelte no longer inlines variables into template ([#13035](https://github.com/sveltejs/kit/pull/13035))

## 0.4.1
### Patch Changes


- fix: correctly handle `<enhanced:img />` elements nested in other DOM elements ([#12945](https://github.com/sveltejs/kit/pull/12945))

## 0.4.0
### Minor Changes


- breaking: require Svelte 5 ([#12822](https://github.com/sveltejs/kit/pull/12822))

## 0.3.10
### Patch Changes


- docs: update URLs for new svelte.dev site ([#12857](https://github.com/sveltejs/kit/pull/12857))

## 0.3.9
### Patch Changes


- chore: upgrade svelte-parse-markup ([#12793](https://github.com/sveltejs/kit/pull/12793))

## 0.3.8
### Patch Changes


- fix: import `node:process` instead of using globals ([#12641](https://github.com/sveltejs/kit/pull/12641))

## 0.3.7
### Patch Changes


- fix: avoid duplicating width/height attributes ([#12673](https://github.com/sveltejs/kit/pull/12673))

## 0.3.6
### Patch Changes


- fix: address Svelte 5 warning ([`ec04dae73702c99652e4972d2b7363f2c11ccf5a`](https://github.com/sveltejs/kit/commit/ec04dae73702c99652e4972d2b7363f2c11ccf5a))

## 0.3.5
### Patch Changes


- perf: hoist vite asset declarations to module block ([#12627](https://github.com/sveltejs/kit/pull/12627))

## 0.3.4
### Patch Changes


- perf: apply performance optimization to dev srcset ([#12621](https://github.com/sveltejs/kit/pull/12621))

## 0.3.3
### Patch Changes


- chore: configure provenance in a simpler manner ([#12570](https://github.com/sveltejs/kit/pull/12570))

## 0.3.2
### Patch Changes


- chore: package provenance ([#12567](https://github.com/sveltejs/kit/pull/12567))


- fix: ensure src attribute is properly formed ([`65931f276ac2102032e3032c864a472eee19b7bb`](https://github.com/sveltejs/kit/commit/65931f276ac2102032e3032c864a472eee19b7bb))

## 0.3.1
### Patch Changes


- fix: make `*?enhanced` imports available in the ambient context ([#12363](https://github.com/sveltejs/kit/pull/12363))

## 0.3.0

### Minor Changes

- breaking: return plugin synchronously from `enhancedImages()` ([#12297](https://github.com/sveltejs/kit/pull/12297))

### Patch Changes

- chore: add keywords for discovery in npm search ([#12330](https://github.com/sveltejs/kit/pull/12330))

## 0.2.1

### Patch Changes

- fix: use correct type for `*?enhanced` imports ([#12224](https://github.com/sveltejs/kit/pull/12224))

## 0.2.0

### Minor Changes

- feat: upgrade vite-imagetools to v7. caches build output by default ([#12055](https://github.com/sveltejs/kit/pull/12055))

## 0.1.9

### Patch Changes

- fix: support shorthand attribute syntax ([#11884](https://github.com/sveltejs/kit/pull/11884))

## 0.1.8

### Patch Changes

- fix: correct images cache key to avoid collisions when images have same name ([#11602](https://github.com/sveltejs/kit/pull/11602))

## 0.1.7

### Patch Changes

- chore: update primary branch from master to main ([`47779436c5f6c4d50011d0ef8b2709a07c0fec5d`](https://github.com/sveltejs/kit/commit/47779436c5f6c4d50011d0ef8b2709a07c0fec5d))

- fix: throw an error if image cannot be resolved ([#11346](https://github.com/sveltejs/kit/pull/11346))

- fix: attempt to address issues accessing images on filesystem ([#11403](https://github.com/sveltejs/kit/pull/11403))

## 0.1.6

### Patch Changes

- chore: upgrade vite-imagetools ([#11122](https://github.com/sveltejs/kit/pull/11122))

## 0.1.5

### Patch Changes

- fix: correctly generate client-side code ([#11059](https://github.com/sveltejs/kit/pull/11059))

## 0.1.4

### Patch Changes

- fix: avoid creating conflicting import statements ([#11047](https://github.com/sveltejs/kit/pull/11047))

## 0.1.3

### Patch Changes

- fix: only resolve images if optimizable ([#11041](https://github.com/sveltejs/kit/pull/11041))

## 0.1.2

### Patch Changes

- fix: refresh in dev mode when an image changes ([#11033](https://github.com/sveltejs/kit/pull/11033))

- fix: auto-import of svg images ([`4426daebe`](https://github.com/sveltejs/kit/commit/4426daebe1d345f60554225e3f12ea932b0110e4))

## 0.1.1

### Patch Changes

- feat: add experimental `@sveltejs/enhanced-img` package ([#10788](https://github.com/sveltejs/kit/pull/10788))
