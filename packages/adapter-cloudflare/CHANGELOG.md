# @sveltejs/adapter-cloudflare

## 1.0.0-next.14

### Patch Changes

- Bumping versions again ([#4090](https://github.com/sveltejs/kit/pull/4090))

## 1.0.0-next.13

### Patch Changes

- Attempt to force @next version bump ([#4088](https://github.com/sveltejs/kit/pull/4088))

## 1.0.0-next.12

### Patch Changes

- [breaking] rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))

## 1.0.0-next.11

### Patch Changes

- Add `context` to `event.platform` object ([#3868](https://github.com/sveltejs/kit/pull/3868))

## 1.0.0-next.10

### Patch Changes

- update to Vite 2.8 and esbuild 0.14 ([#3791](https://github.com/sveltejs/kit/pull/3791))

## 1.0.0-next.9

### Patch Changes

- Pass `env` object to SvelteKit via `platform` ([#3429](https://github.com/sveltejs/kit/pull/3429))

## 1.0.0-next.8

### Patch Changes

- Breaking: change app.render signature to (request: Request) => Promise<Response> ([#3384](https://github.com/sveltejs/kit/pull/3384))

## 1.0.0-next.7

### Patch Changes

- Add immutable cache headers to generated assets ([#3222](https://github.com/sveltejs/kit/pull/3222))

## 1.0.0-next.6

### Patch Changes

- use posix to resolve relative path ([#3214](https://github.com/sveltejs/kit/pull/3214))

## 1.0.0-next.5

### Patch Changes

- Overhaul adapter API ([#2931](https://github.com/sveltejs/kit/pull/2931))

* Remove esbuild options ([#2931](https://github.com/sveltejs/kit/pull/2931))

- Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

## 1.0.0-next.4

### Patch Changes

- Updated Cloudflare adapter to allow static files with spaces (eg. "Example File.pdf") to be accessed. ([#3047](https://github.com/sveltejs/kit/pull/3047))

## 1.0.0-next.3

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.2

### Patch Changes

- - Allow `npm publish` to succeed via `publishConfig.access` config ([#2834](https://github.com/sveltejs/kit/pull/2834))
  - Add instructions to README for configuring a new/existing Pages project

## 1.0.0-next.1

### Patch Changes

- Add new "adapter-cloudflare" package for Cloudflare Pages with Workers integration ([#2815](https://github.com/sveltejs/kit/pull/2815))

## 1.0.0-next.0

- Initial release
