# create-svelte

## 5.0.5

### Patch Changes

- chore: upgrade `vitest` to 0.34.0 and `@clack/prompts` to 0.7.0 ([#10240](https://github.com/sveltejs/kit/pull/10240))

## 5.0.4

### Patch Changes

- chore: upgrade @fontsource/fira-mono to v5 ([#10445](https://github.com/sveltejs/kit/pull/10445))

- chore: upgrade to vitest 0.33.0 ([#10445](https://github.com/sveltejs/kit/pull/10445))

## 5.0.3

### Patch Changes

- chore: bump Vite and Svelte dependencies ([#10330](https://github.com/sveltejs/kit/pull/10330))

- fix: create lib folder in skeleton project ([#10341](https://github.com/sveltejs/kit/pull/10341))

## 5.0.2

### Patch Changes

- fix: npm test should run unit tests ([#10241](https://github.com/sveltejs/kit/pull/10241))

- chore: upgrade vitest ([#10236](https://github.com/sveltejs/kit/pull/10236))

## 5.0.1

### Patch Changes

- chore: use satisfies keyword in jsdocs, in create-svelte default template ([#10203](https://github.com/sveltejs/kit/pull/10203))

## 5.0.0

### Major Changes

- breaking: install Svelte 4 ([#10217](https://github.com/sveltejs/kit/pull/10217))

## 4.2.0

### Minor Changes

- feat: Add `data-sveltekit-preload-data` to lib template ([#9863](https://github.com/sveltejs/kit/pull/9863))

## 4.1.1

### Patch Changes

- fix: default playwright globs ([#9795](https://github.com/sveltejs/kit/pull/9795))

- fix: remove obsolete `ignorePatterns: ['*.cjs']` from .eslintrc.cjs ([#9797](https://github.com/sveltejs/kit/pull/9797))

## 4.1.0

### Minor Changes

- feat: set `resolution-mode=highest` in generated `.npmrc` ([#9781](https://github.com/sveltejs/kit/pull/9781))

## 4.0.0

### Major Changes

- feat: switch default ESLint plugin from `eslint-plugin-svelte3` to `eslint-plugin-svelte` ([#9749](https://github.com/sveltejs/kit/pull/9749))

## 3.3.1

### Patch Changes

- feat: upgrade to Vite 4.3 for faster build times ([#9737](https://github.com/sveltejs/kit/pull/9737))

- fix: generate tsconfig/jsconfig correctly for library option ([#9712](https://github.com/sveltejs/kit/pull/9712))

## 3.3.0

### Minor Changes

- feat: ignore test files in library skeleton package.json ([#9584](https://github.com/sveltejs/kit/pull/9584))

## 3.2.0

### Minor Changes

- feat: upgrade to TypeScript 5 ([#9435](https://github.com/sveltejs/kit/pull/9435))

### Patch Changes

- chore: upgrade to Vite 4.2 ([#9434](https://github.com/sveltejs/kit/pull/9434))

## 3.1.2

### Patch Changes

- fix: prevent duplicated lines in project creation CLI ([#9346](https://github.com/sveltejs/kit/pull/9346))

## 3.1.1

### Patch Changes

- chore: Add hint for toggling additional options during scaffolding flow. ([#9318](https://github.com/sveltejs/kit/pull/9318))

## 3.1.0

### Minor Changes

- feat: use `@clack/prompts` ([#9219](https://github.com/sveltejs/kit/pull/9219))

## 3.0.4

### Patch Changes

- docs: inform about adapter-auto not supporting all environments ([#9196](https://github.com/sveltejs/kit/pull/9196))

## 3.0.3

### Patch Changes

- chore: enhance library skeleton readme with some library instructions ([#9128](https://github.com/sveltejs/kit/pull/9128))

## 3.0.2

### Patch Changes

- chore: avoid running publint twice in prepublish ([#9126](https://github.com/sveltejs/kit/pull/9126))

- fix: add `dist` to `pkg.files` and `.gitignore` ([#9124](https://github.com/sveltejs/kit/pull/9124))

## 3.0.1

### Patch Changes

- fix: update dependency @sveltejs/package to v2.0.0 ([#9087](https://github.com/sveltejs/kit/pull/9087))

## 3.0.0

### Major Changes

- breaking: update library scaffolding for `@sveltejs/package` version 2 ([#8922](https://github.com/sveltejs/kit/pull/8922))

## 2.3.4

### Patch Changes

- fix: use new locator API to improve demo test ([#8988](https://github.com/sveltejs/kit/pull/8988))

## 2.3.3

### Patch Changes

- chore: bump `@sveltejs/kit` and `@sveltejs/adapter-auto` versions ([#8740](https://github.com/sveltejs/kit/pull/8740))

- fix: adjust vite config type to work with vitest options ([#8871](https://github.com/sveltejs/kit/pull/8871))

## 2.3.2

### Patch Changes

- fix: remove duplicate space around JSDoc comments removed for TypeScript demo app ([#8684](https://github.com/sveltejs/kit/pull/8684))

## 2.3.1

### Patch Changes

- chore: remove obsolete comment from templates ([#8620](https://github.com/sveltejs/kit/pull/8620))

## 2.3.0

### Minor Changes

- fix: adjust `app.d.ts` to diminish confusion about imports ([#8477](https://github.com/sveltejs/kit/pull/8477))

## 2.2.1

### Patch Changes

- fix: note why TypeScript is always installed for library projects and add jsconfig ([#8484](https://github.com/sveltejs/kit/pull/8484))

## 2.2.0

### Minor Changes

- feat: use svelte-check v3 ([#8468](https://github.com/sveltejs/kit/pull/8468))

## 2.1.0

### Minor Changes

- feat: create vite.config.ts for TypeScript projects ([#8258](https://github.com/sveltejs/kit/pull/8258))

## 2.0.2

### Patch Changes

- fix: address flakiness in playwright test ([#8162](https://github.com/sveltejs/kit/pull/8162))

## 2.0.1

### Patch Changes

- chore: no code change, rerelease as 2.0.1 for technical reasons ([#8161](https://github.com/sveltejs/kit/pull/8161))

## 2.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 2.0.0-next.204

### Patch Changes

- feat: remove release candidate banner ([#8109](https://github.com/sveltejs/kit/pull/8109))

## 2.0.0-next.203

### Patch Changes

- chore: add peerDependencies, add more specific next version ([#8141](https://github.com/sveltejs/kit/pull/8141))

## 2.0.0-next.202

### Patch Changes

- feat: vitePreprocess ([#8036](https://github.com/sveltejs/kit/pull/8036))

## 2.0.0-next.201

### Patch Changes

- breaking: upgrade to Vite 4 ([#7543](https://github.com/sveltejs/kit/pull/7543))

## 2.0.0-next.200

### Patch Changes

- Use `satisfies` operator ([#7861](https://github.com/sveltejs/kit/pull/7861))

## 2.0.0-next.199

### Patch Changes

- fix: improve Sverdle a11y ([#7960](https://github.com/sveltejs/kit/pull/7960))

## 2.0.0-next.198

### Patch Changes

- Upgrade dependencies in templates ([#7866](https://github.com/sveltejs/kit/pull/7866))

## 2.0.0-next.197

### Patch Changes

- Upgrade dependencies ([#7852](https://github.com/sveltejs/kit/pull/7852))

## 2.0.0-next.196

### Patch Changes

- Update app.d.ts files ([#7003](https://github.com/sveltejs/kit/pull/7003))

## 2.0.0-next.195

### Patch Changes

- breaking: Replace `data-sveltekit-prefetch` with `-preload-code` and `-preload-data` ([#7776](https://github.com/sveltejs/kit/pull/7776))
- Upgrade to Playwright 1.28.1 ([#7696](https://github.com/sveltejs/kit/pull/7696))

## 2.0.0-next.194

### Patch Changes

- fix playwright glob filter ([#7826](https://github.com/sveltejs/kit/pull/7826))

## 2.0.0-next.193

### Patch Changes

- Added the option to add Vitest to new projects ([#5708](https://github.com/sveltejs/kit/pull/5708))

## 2.0.0-next.192

### Patch Changes

- Ignore Vite timestamp files by default in `create-svelte` templates (added to `.gitignore`) ([#7660](https://github.com/sveltejs/kit/pull/7660))

## 2.0.0-next.191

### Patch Changes

- Add `style="display: contents"` to wrapper element by default ([#7652](https://github.com/sveltejs/kit/pull/7652))

## 2.0.0-next.190

### Patch Changes

- fix: remove Sverdle from Stackblitz template ([#7448](https://github.com/sveltejs/kit/pull/7448))

## 2.0.0-next.189

### Patch Changes

- update dependencies ([#7355](https://github.com/sveltejs/kit/pull/7355))

## 2.0.0-next.188

### Patch Changes

- Use aria-current instead of active class in nav ([#7376](https://github.com/sveltejs/kit/pull/7376))

## 2.0.0-next.187

### Patch Changes

- Add missing titles and descriptions to the Sverdle pages ([#7351](https://github.com/sveltejs/kit/pull/7351))
- Use `justify-content: flex-start;` on Sverdle CSS to avoid compatibility issues ([#7352](https://github.com/sveltejs/kit/pull/7352))

## 2.0.0-next.186

### Patch Changes

- feat: add reset option to update method of enhance ([#7326](https://github.com/sveltejs/kit/pull/7326))

## 2.0.0-next.185

### Patch Changes

- Warn user when they accidentally try to publish the `./` directory ([#7280](https://github.com/sveltejs/kit/pull/7280))

## 2.0.0-next.184

### Patch Changes

- fix sverdle guesses incorrectly cleared by form `enhance` ([#7241](https://github.com/sveltejs/kit/pull/7241))

## 2.0.0-next.183

### Patch Changes

- feat: extract and export types from create-svelte ([#7111](https://github.com/sveltejs/kit/pull/7111))

## 2.0.0-next.182

### Patch Changes

- Work around SSR transform bug ([#7088](https://github.com/sveltejs/kit/pull/7088))

## 2.0.0-next.181

### Patch Changes

- Fix template description for SvelteKit demo app ([#7076](https://github.com/sveltejs/kit/pull/7076))

## 2.0.0-next.180

### Patch Changes

- Replace /todos page in demo app with /sverdle ([#6979](https://github.com/sveltejs/kit/pull/6979))

## 2.0.0-next.179

### Patch Changes

- breaking: rename App.PageError to App.Error ([#6963](https://github.com/sveltejs/kit/pull/6963))

## 2.0.0-next.178

### Patch Changes

- fix: prettier not formatting svelte files ([#6866](https://github.com/sveltejs/kit/pull/6866))

## 2.0.0-next.177

### Patch Changes

- chore: bump vite ([#6829](https://github.com/sveltejs/kit/pull/6829))

## 2.0.0-next.176

### Patch Changes

- SvelteKit 1.0 RC ([#6707](https://github.com/sveltejs/kit/pull/6707))

## 2.0.0-next.175

### Patch Changes

- breaking: update use:enhance usage ([#6697](https://github.com/sveltejs/kit/pull/6697))
- breaking: hooks file rename ([#6697](https://github.com/sveltejs/kit/pull/6697))

## 2.0.0-next.174

### Patch Changes

- Remove cookie package from demo app ([#6602](https://github.com/sveltejs/kit/pull/6602))

## 2.0.0-next.173

### Patch Changes

- breaking: Replace `POST`/`PUT`/`PATCH`/`DELETE` in `+page.server.js` with `export const actions` ([#6469](https://github.com/sveltejs/kit/pull/6469))

## 2.0.0-next.172

### Patch Changes

- Bump vite-plugin-svelte and required vite version ([#6583](https://github.com/sveltejs/kit/pull/6583))

## 2.0.0-next.171

### Patch Changes

- Use `invalidateAll()` ([#6493](https://github.com/sveltejs/kit/pull/6493))

## 2.0.0-next.170

### Patch Changes

- reorder create-svelte templates such that library is last ([#6481](https://github.com/sveltejs/kit/pull/6481))

## 2.0.0-next.169

### Patch Changes

- Move `data-sveltekit-prefetch` to `<nav>` element ([#6442](https://github.com/sveltejs/kit/pull/6442))

## 2.0.0-next.168

### Patch Changes

- chore: bump ts version and ensure it works with latest changes ([#6428](https://github.com/sveltejs/kit/pull/6428))

## 2.0.0-next.167

### Patch Changes

- breaking: Replace `sveltekit:*` with valid HTML attributes like `data-sveltekit-*` ([#6170](https://github.com/sveltejs/kit/pull/6170))

## 2.0.0-next.166

### Patch Changes

- Remove App.PrivateEnv and App.PublicEnv placeholders ([#6413](https://github.com/sveltejs/kit/pull/6413))

## 2.0.0-next.165

### Patch Changes

- Update to Vite 3.1.0-beta.1 ([#6407](https://github.com/sveltejs/kit/pull/6407))

## 2.0.0-next.164

### Patch Changes

- breaking: rename `$app/env` to `$app/environment`, to disambiguate with `$env/...` ([#6334](https://github.com/sveltejs/kit/pull/6334))
- Add svelte-kit sync to check scripts in checkjs templates ([#6339](https://github.com/sveltejs/kit/pull/6339))

## 2.0.0-next.163

### Patch Changes

- fix type definition issue that caused a svelte-check error when using TS 4.8 ([#6306](https://github.com/sveltejs/kit/pull/6306))

## 2.0.0-next.162

### Patch Changes

- remove some unused code ([#6287](https://github.com/sveltejs/kit/pull/6287))

## 2.0.0-next.161

### Patch Changes

- feat: add App.PageData type ([#6226](https://github.com/sveltejs/kit/pull/6226))

## 2.0.0-next.160

### Patch Changes

- Create TypeScript/JSDoc/vanilla versions of shared template .ts files ([#6253](https://github.com/sveltejs/kit/pull/6253))
- Create vite.config.ts when creating TypeScript project ([#6253](https://github.com/sveltejs/kit/pull/6253))
- Invalidate data after form submission ([#6254](https://github.com/sveltejs/kit/pull/6254))

## 2.0.0-next.159

### Patch Changes

- Update text referring to route location ([#6134](https://github.com/sveltejs/kit/pull/6134))

## 2.0.0-next.158

### Patch Changes

- Add notes about includes/excludes and path aliases ([#6085](https://github.com/sveltejs/kit/pull/6085))
- setup prettier plugin-search-dirs to enable use with pnpm ([#6101](https://github.com/sveltejs/kit/pull/6101))

## 2.0.0-next.157

### Patch Changes

- Run svelte-kit sync before svelte-check in check scripts ([#6037](https://github.com/sveltejs/kit/pull/6037))

## 2.0.0-next.156

### Patch Changes

- update `app.d.ts` for library skeleton template ([#6020](https://github.com/sveltejs/kit/pull/6020))

## 2.0.0-next.155

### Patch Changes

- make variable names more descriptive ([#5983](https://github.com/sveltejs/kit/pull/5983))

## 2.0.0-next.154

### Patch Changes

- remove session remnants ([#5966](https://github.com/sveltejs/kit/pull/5966))
- remove outdated notes in `api.ts` ([#5964](https://github.com/sveltejs/kit/pull/5964))

## 2.0.0-next.153

### Patch Changes

- Update templates ([#5778](https://github.com/sveltejs/kit/pull/5778))

## 2.0.0-next.152

### Patch Changes

- Use @sveltejs/kit postinstall lifecycle hook to invoke 'svelte-kit sync' instead of prepare in projects created by create-svelte ([#5760](https://github.com/sveltejs/kit/pull/5760))

## 2.0.0-next.151

### Patch Changes

- feat: include reference to `@sveltejs/kit` types in ambient file ([#5745](https://github.com/sveltejs/kit/pull/5745))

## 2.0.0-next.150

### Patch Changes

- Remove initial-scale=1 from meta tags ([#5706](https://github.com/sveltejs/kit/pull/5706))

## 2.0.0-next.149

### Patch Changes

- uppercase handlers ([#5513](https://github.com/sveltejs/kit/pull/5513))

## 2.0.0-next.148

### Patch Changes

- Update dependencies ([#5005](https://github.com/sveltejs/kit/pull/5005))

## 2.0.0-next.147

### Patch Changes

- chore: upgrade TypeScript to 4.7.4 ([#5414](https://github.com/sveltejs/kit/pull/5414))

## 2.0.0-next.146

### Patch Changes

- Add vite.config.js to the create-svelte templates ([#5332](https://github.com/sveltejs/kit/pull/5332))
- breaking: switch to vite CLI for dev, build, and preview commands ([#5332](https://github.com/sveltejs/kit/pull/5332))

## 2.0.0-next.145

### Patch Changes

- fix todos fail to update in demo app ([#5354](https://github.com/sveltejs/kit/pull/5354))

## 2.0.0-next.144

### Patch Changes

- Revert to use ESM eslint config files ([#5293](https://github.com/sveltejs/kit/pull/5293))

## 2.0.0-next.143

### Patch Changes

- Enhance docs on importing types in app.d.ts ([#5280](https://github.com/sveltejs/kit/pull/5280))
- Use ESM eslint config files ([#5263](https://github.com/sveltejs/kit/pull/5263))
- fix formatting for initial package.json ([#5271](https://github.com/sveltejs/kit/pull/5271))

## 2.0.0-next.142

### Patch Changes

- Add descriptions to templates, and make TypeScript options more self-explanatory ([#5221](https://github.com/sveltejs/kit/pull/5221))

## 2.0.0-next.141

### Patch Changes

- fix: use inline element in heading ([#5164](https://github.com/sveltejs/kit/pull/5164))

## 2.0.0-next.140

### Patch Changes

- Use crypto.randomUUID() instead of @lukeed/uuid ([#5042](https://github.com/sveltejs/kit/pull/5042))

## 2.0.0-next.139

### Patch Changes

- correct default package.json format ([#5013](https://github.com/sveltejs/kit/pull/5013))
- breaking: Replace `%svelte.body%` with `%sveltekit.body%`, etc. ([#5016](https://github.com/sveltejs/kit/pull/5016))

## 2.0.0-next.138

### Patch Changes

- Use separate ignore files for prettier and eslint ([#5009](https://github.com/sveltejs/kit/pull/5009))

## 2.0.0-next.137

### Patch Changes

- import generated types from `__types/index.d.ts` file ([#4705](https://github.com/sveltejs/kit/pull/4705))

## 2.0.0-next.136

### Patch Changes

- Add README ([#4951](https://github.com/sveltejs/kit/pull/4951))

## 2.0.0-next.135

### Patch Changes

- remove unnecessary CHANGELOG.md ([#4903](https://github.com/sveltejs/kit/pull/4903))

## 2.0.0-next.134

### Patch Changes

- fix lib, module, and target to not override the tsconfig they generate by default ([#4893](https://github.com/sveltejs/kit/pull/4893))

## 2.0.0-next.133

### Patch Changes

- Bump `eslint` from version 7 to 8 ([#4553](https://github.com/sveltejs/kit/pull/4553))

## 2.0.0-next.132

### Patch Changes

- Remove default `<meta name="description">` and add separate descriptions to each page ([#4686](https://github.com/sveltejs/kit/pull/4686))

## 2.0.0-next.131

### Patch Changes

- Make hooks file comply with TypeScript strictest mode ([#4667](https://github.com/sveltejs/kit/pull/4667))

## 2.0.0-next.130

### Patch Changes

- Ignore .turbo directory when building templates ([#4638](https://github.com/sveltejs/kit/pull/4638))
- Disable type checking by default for non-typescript projects. ([#4621](https://github.com/sveltejs/kit/pull/4621))
- breaking: move non-essential TypeScript compilerOptions into user-editable config ([#4633](https://github.com/sveltejs/kit/pull/4633))

## 2.0.0-next.129

### Patch Changes

- type check exception handling on form action ([#4532](https://github.com/sveltejs/kit/pull/4532))
- Update broken documentation links for `App` namespaces ([#4627](https://github.com/sveltejs/kit/pull/4627))

## 2.0.0-next.128

### Patch Changes

- chore: upgrade to Playwright 1.21.0 ([#4601](https://github.com/sveltejs/kit/pull/4601))

## 2.0.0-next.127

### Patch Changes

- Fix iOS double-tap zoom on counter buttons ([#4390](https://github.com/sveltejs/kit/pull/4390))

## 2.0.0-next.126

### Patch Changes

- fix: use .ts extension for tests when using TypeScript ([#4368](https://github.com/sveltejs/kit/pull/4368))

## 2.0.0-next.125

### Patch Changes

- fix: check for app.d.ts rather than global.d.ts ([#4295](https://github.com/sveltejs/kit/pull/4295))

## 2.0.0-next.124

### Patch Changes

- Add sync CLI command ([#4182](https://github.com/sveltejs/kit/pull/4182))
- Upgrade to TypeScript 4.6 ([#4190](https://github.com/sveltejs/kit/pull/4190))

## 2.0.0-next.123

### Patch Changes

- Extend user tsconfig from generated .svelte-kit/tsconfig.json ([#4118](https://github.com/sveltejs/kit/pull/4118))

## 2.0.0-next.122

### Patch Changes

- remove unnecessary CSS units ([#4115](https://github.com/sveltejs/kit/pull/4115))

## 2.0.0-next.121

### Patch Changes

- Add option to create integration tests with Playwright ([#4056](https://github.com/sveltejs/kit/pull/4056))

## 2.0.0-next.120

### Patch Changes

- fix `@typescript-eslint/no-empty-interface` lint error when starting a new app with eslint ([#4077](https://github.com/sveltejs/kit/pull/4077))

## 2.0.0-next.119

### Patch Changes

- fix: update docs URL for App namespace interfaces ([#4042](https://github.com/sveltejs/kit/pull/4042))

## 2.0.0-next.118

### Patch Changes

- make demo app work without JS ([#3970](https://github.com/sveltejs/kit/pull/3970))

## 2.0.0-next.117

### Patch Changes

- update comment to remove outdated reference ([#3898](https://github.com/sveltejs/kit/pull/3898))

## 2.0.0-next.116

### Patch Changes

- use preserveValueImports flag ([#3064](https://github.com/sveltejs/kit/pull/3064))

## 2.0.0-next.115

### Patch Changes

- fix links pointing to multi-page docs ([#3815](https://github.com/sveltejs/kit/pull/3815))
- upgrade to TypeScript 4.5 ([#3809](https://github.com/sveltejs/kit/pull/3809))

## 2.0.0-next.114

### Patch Changes

- Add App namespace for app-level types ([#3670](https://github.com/sveltejs/kit/pull/3670))
- Remove target option ([#3674](https://github.com/sveltejs/kit/pull/3674))

## 2.0.0-next.113

### Patch Changes

- Bump version ([#3610](https://github.com/sveltejs/kit/pull/3610))

## 2.0.0-next.112

### Patch Changes

- Try this ([#3608](https://github.com/sveltejs/kit/pull/3608))

## 2.0.0-next.111

### Patch Changes

- I think this might be it ([#3606](https://github.com/sveltejs/kit/pull/3606))

## 2.0.0-next.110

### Patch Changes

- And again ([#3604](https://github.com/sveltejs/kit/pull/3604))

## 2.0.0-next.109

### Patch Changes

- Bump version ([#3602](https://github.com/sveltejs/kit/pull/3602))

## 2.0.0-next.108

### Patch Changes

- And again ([#3600](https://github.com/sveltejs/kit/pull/3600))

## 2.0.0-next.107

### Patch Changes

- Trying something ([#3598](https://github.com/sveltejs/kit/pull/3598))

## 2.0.0-next.105

### Patch Changes

- Another meaningless change ([#3596](https://github.com/sveltejs/kit/pull/3596))

## 2.0.0-next.104

### Patch Changes

- typo ([#3593](https://github.com/sveltejs/kit/pull/3593))

## 2.0.0-next.103

### Patch Changes

- Tweak README ([#3591](https://github.com/sveltejs/kit/pull/3591))

## 2.0.0-next.102

### Patch Changes

- Fix typo ([#3583](https://github.com/sveltejs/kit/pull/3583))

## 2.0.0-next.101

### Patch Changes

- bump eslint plugin and parser in template ([#3544](https://github.com/sveltejs/kit/pull/3544))

## 2.0.0-next.100

### Patch Changes

- add ESLint configuration for mixed JS/TS codebase ([#3536](https://github.com/sveltejs/kit/pull/3536))

## 2.0.0-next.99

### Patch Changes

- Respect Ctrl-C when running create-svelte ([#3472](https://github.com/sveltejs/kit/pull/3472))
- Make project name an explicit option' ([#3472](https://github.com/sveltejs/kit/pull/3472))
- Prompt for directory when running create-svelte without argument ([#3472](https://github.com/sveltejs/kit/pull/3472))

## 2.0.0-next.98

### Patch Changes

- Add index.js file to `pkg.files` ([#3445](https://github.com/sveltejs/kit/pull/3445))

## 2.0.0-next.97

### Patch Changes

- Add a programmatic interface to create-svelte ([#3437](https://github.com/sveltejs/kit/pull/3437))

## 2.0.0-next.96

### Patch Changes

- breaking: change app.render signature to (request: Request) => Promise (#3384) ([#3430](https://github.com/sveltejs/kit/pull/3430))

## 2.0.0-next.95

### Patch Changes

- Add methodOverrides to default configs ([#3411](https://github.com/sveltejs/kit/pull/3411))

## 2.0.0-next.94

### Patch Changes

- Add methodOverride option for submitting PUT/PATCH/DELETE/etc with <form> elements ([#2989](https://github.com/sveltejs/kit/pull/2989))

## 2.0.0-next.93

### Patch Changes

- Update template files to include %svelte.assets% ([#3234](https://github.com/sveltejs/kit/pull/3234))

## 2.0.0-next.92

### Patch Changes

- Update template to use new page/request APIs ([#3146](https://github.com/sveltejs/kit/pull/3146))

## 2.0.0-next.91

### Patch Changes

- Make demo app complies with TypeScript strict mode ([#3095](https://github.com/sveltejs/kit/pull/3095))

## 2.0.0-next.90

### Patch Changes

- bump eslint ecmaVersion to 2020 ([#2985](https://github.com/sveltejs/kit/pull/2985))
- include missing .npmrc in templates ([#2990](https://github.com/sveltejs/kit/pull/2990))
- Do not gitignore `.env.example` ([#2926](https://github.com/sveltejs/kit/pull/2926))
- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 2.0.0-next.89

### Patch Changes

- Git ignore files with a .env. prefix ([#2905](https://github.com/sveltejs/kit/pull/2905))

## 2.0.0-next.88

### Patch Changes

- Improve project scaffolding language ([#2895](https://github.com/sveltejs/kit/pull/2895))

## 2.0.0-next.87

### Patch Changes

- Add adapter-auto to template configs ([#2885](https://github.com/sveltejs/kit/pull/2885))

## 2.0.0-next.86

### Patch Changes

- Add adapter-auto ([#2867](https://github.com/sveltejs/kit/pull/2867))
- Add an npm run package command to templates ([#2882](https://github.com/sveltejs/kit/pull/2882))

## 2.0.0-next.85

### Patch Changes

- feat: added .env to gitignore for skeleton and default starters ([#2732](https://github.com/sveltejs/kit/pull/2732))

## 2.0.0-next.84

### Patch Changes

- Add explicit types in `_api.ts` and `form.ts` for TypeScript and ESLint integration example ([#2657](https://github.com/sveltejs/kit/pull/2657))

## 2.0.0-next.83

### Patch Changes

- breaking: drop Node 12 support ([#2604](https://github.com/sveltejs/kit/pull/2604))

## 2.0.0-next.82

### Patch Changes

- chore: upgrade to Svelte 3.43.0" ([#2474](https://github.com/sveltejs/kit/pull/2474))

## 2.0.0-next.81

### Patch Changes

- fix: provide valid value for `letter-spacing` CSS property ([#2437](https://github.com/sveltejs/kit/pull/2437))
- update dependencies ([#2447](https://github.com/sveltejs/kit/pull/2447))

## 2.0.0-next.80

### Patch Changes

- chore: add links to repository and homepage to package.json ([#2425](https://github.com/sveltejs/kit/pull/2425))

## 2.0.0-next.79

### Patch Changes

- Use the name of folder as name in package.json ([#2415](https://github.com/sveltejs/kit/pull/2415))

## 2.0.0-next.78

### Patch Changes

- Disable delete button while waiting for API response ([#2172](https://github.com/sveltejs/kit/pull/2172))

## 2.0.0-next.77

### Patch Changes

- 94b34fa6: [breaking] standardize final output dir as /build (vs /.svelte-kit) ([#2109](https://github.com/sveltejs/kit/pull/2109))

## 2.0.0-next.76

### Patch Changes

- b9e63381: Add DOM to lib in tsconfig ([#1956](https://github.com/sveltejs/kit/pull/1956))

## 2.0.0-next.75

### Patch Changes

- fe68e13: Simplify component file names ([#1878](https://github.com/sveltejs/kit/pull/1878))

## 2.0.0-next.74

### Patch Changes

- 4c7ccfd: Add \$lib alias to js/tsconfig ([#1860](https://github.com/sveltejs/kit/pull/1860))

## 2.0.0-next.73

### Patch Changes

- 2d2fab1: Add favicon to skeleton template ([#1514](https://github.com/sveltejs/kit/pull/1514))
- 6aa4988: Replace favicon ([#1589](https://github.com/sveltejs/kit/pull/1589))

## 2.0.0-next.72

### Patch Changes

- 1739443: Add svelte-check to TS templates ([#1556](https://github.com/sveltejs/kit/pull/1556))
- 6372690: gitignore package directory ([#1499](https://github.com/sveltejs/kit/pull/1499))
- f211906: Adjust build-template script to include package.json ([#1555](https://github.com/sveltejs/kit/pull/1555))

## 2.0.0-next.71

### Patch Changes

- dad93fc: Fix workspace dependencies ([#1434](https://github.com/sveltejs/kit/pull/1434))

## 2.0.0-next.70

### Patch Changes

- d871213: Remove Vite dependency from apps ([#1374](https://github.com/sveltejs/kit/pull/1374))

## 2.0.0-next.69

### Patch Changes

- 9cc2508: Ensure template files match Prettier settings ([#1364](https://github.com/sveltejs/kit/pull/1364))
- f5e626d: Reference Vite/Svelte types inside Kit types ([#1319](https://github.com/sveltejs/kit/pull/1319))
- 8a402a9: Exclude deploy artifacts from create-svelte package ([#1363](https://github.com/sveltejs/kit/pull/1363))
- e8bed05: Prompt to npm install before prompting to git init ([#1362](https://github.com/sveltejs/kit/pull/1362))
- 507e2c3: fix: Prettier not formatting .svelte files ([#1360](https://github.com/sveltejs/kit/pull/1360))

## 2.0.0-next.68

### Patch Changes

- 5ed3ed2: Fix usage of request.locals in starter project ([#1344](https://github.com/sveltejs/kit/pull/1344))

## 2.0.0-next.67

### Patch Changes

- d15b48a: Add renamed .svelte -> .svelte-kit directory to ignore files ([#1339](https://github.com/sveltejs/kit/pull/1339))

## 2.0.0-next.66

### Patch Changes

- 1753987: Use request.locals

## 2.0.0-next.65

### Patch Changes

- 0befffb: Rename .svelte to .svelte-kit ([#1321](https://github.com/sveltejs/kit/pull/1321))
- c6fde99: Switch to ESM in config files ([#1323](https://github.com/sveltejs/kit/pull/1323))

## 2.0.0-next.64

### Patch Changes

- 3fb191c: Improved install prompts, turn confirms into toggle ([#1312](https://github.com/sveltejs/kit/pull/1312))

## 2.0.0-next.63

### Patch Changes

- d19f3de: bump minimum required Svelte version ([#1192](https://github.com/sveltejs/kit/pull/1192))

## 2.0.0-next.62

### Patch Changes

- c44f231: Improve a11y on to-do list in template ([#1207](https://github.com/sveltejs/kit/pull/1207))

## 2.0.0-next.61

### Patch Changes

- 82955ec: fix: adapt to svelte ids without ?import in vite 2.2.3

## 2.0.0-next.60

### Patch Changes

- 1b816b2: Update version of eslint-plugin-svelte3 ([#1195](https://github.com/sveltejs/kit/pull/1195))
- 6f2b4a6: Update welcome message ([#1196](https://github.com/sveltejs/kit/pull/1196))
- 6f2b4a6: No adapter by default ([#1196](https://github.com/sveltejs/kit/pull/1196))

## 2.0.0-next.59

### Patch Changes

- a2f3f4b: Rename `start` to `preview` in the CLI and package scripts

## 2.0.0-next.58

### Patch Changes

- 2bf4338: Add .gitignore files to new projects ([#1167](https://github.com/sveltejs/kit/pull/1167))

## 2.0.0-next.57

### Patch Changes

- 4645ad5: Remove obsolete vite.ssr config from template ([#1148](https://github.com/sveltejs/kit/pull/1148))
- 872d734: Hide out-of-view counter from assistive tech ([#1150](https://github.com/sveltejs/kit/pull/1150))

## 2.0.0-next.56

### Patch Changes

- cdf4d5b: Show git init instructions when creating new project
- 112d194: Uppercase method in template ([#1119](https://github.com/sveltejs/kit/pull/1119))

## 2.0.0-next.55

### Patch Changes

- daf6913: Fix bootstrapping command on about page ([#1105](https://github.com/sveltejs/kit/pull/1105))

## 2.0.0-next.54

### Patch Changes

- a84cb88: Fix global.d.ts rename, Windows build issue, missing adapter-node ([#1095](https://github.com/sveltejs/kit/pull/1095))

## 2.0.0-next.53

### Patch Changes

- 27c2e1d: Fix CSS on demo app hero image ([#1088](https://github.com/sveltejs/kit/pull/1088))
- bbeb58f: Include dotfiles when creating new project ([#1084](https://github.com/sveltejs/kit/pull/1084))
- 6a8e73f: Remove large image from create-svelte ([#1085](https://github.com/sveltejs/kit/pull/1085))

## 2.0.0-next.52

### Patch Changes

- f342372: Adding new Hello World templates (default with enhanced style and skeleton) to create-svelte ([#1014](https://github.com/sveltejs/kit/pull/1014))

## 2.0.0-next.51

### Patch Changes

- 4cffc14: add global.d.ts to js version ([#1051](https://github.com/sveltejs/kit/pull/1051))

## 2.0.0-next.50

### Patch Changes

- 3802c64: Fix build so that the package can be automatically published ([#1001](https://github.com/sveltejs/kit/pull/1001))

## 2.0.0-next.49

### Patch Changes

- 3c41d07: Fix preprocess option in template
- 9bb747f: Remove CSS option and simplify ([#989](https://github.com/sveltejs/kit/pull/989))

## 2.0.0-next.48

### Patch Changes

- 4c45784: Add ambient types to published files ([#980](https://github.com/sveltejs/kit/pull/980))

## 2.0.0-next.47

### Patch Changes

- 59a1e06: Add button:focus CSS styles to index page of default app ([#957](https://github.com/sveltejs/kit/pull/957))
- 39b6967: Add ambient type definitions for \$app imports ([#917](https://github.com/sveltejs/kit/pull/917))
- dfbe62b: Add title tag to index page of default app ([#954](https://github.com/sveltejs/kit/pull/954))

## 2.0.0-next.46

### Patch Changes

- 570f90c: Update tsconfig to use module and lib es2020 ([#817](https://github.com/sveltejs/kit/pull/817))
- 8d453c8: Specify minimum Node version number in @sveltejs/kit and add .npmrc to enforce it ([#787](https://github.com/sveltejs/kit/pull/787))

## 2.0.0-next.45

### Patch Changes

- dac29c5: allow importing JSON modules ([#792](https://github.com/sveltejs/kit/pull/792))
- 8dc89ba: Set target to es2019 in default tsconfig.json ([#772](https://github.com/sveltejs/kit/pull/772))

## 2.0.0-next.44

### Patch Changes

- 7e51473: fix eslint error in ts starter template, add eslint and prettier ignore config
- 7d42f72: Add a global stylesheet during create-svelte depending on the chosen CSS preprocessor ([#726](https://github.com/sveltejs/kit/pull/726))

## 2.0.0-next.43

### Patch Changes

- bdf4ed9: Fix typo in `ignorePatterns` for the `.eslintrc.cjs` generated for TypeScript projects so that `.eslintrc.cjs` correctly ignores itself. ([#701](https://github.com/sveltejs/kit/pull/701))
- f7badf1: Add '\$service-worker' to paths in tsconfig.json ([#716](https://github.com/sveltejs/kit/pull/716))
- 9a664e1: Set `.eslintrc.cjs` to ignore all `.cjs` files. ([#707](https://github.com/sveltejs/kit/pull/707))
- df380e6: Add env options to eslint config ([#722](https://github.com/sveltejs/kit/pull/722))

## 2.0.0-next.42

### Patch Changes

- a52cf82: add eslint and prettier setup options ([#632](https://github.com/sveltejs/kit/pull/632))

## 2.0.0-next.41

### Patch Changes

- 8024178: remove @sveltejs/app-utils ([#600](https://github.com/sveltejs/kit/pull/600))

## 2.0.0-next.40

### Patch Changes

- 8805c6d: Pass adapters directly to svelte.config.cjs ([#579](https://github.com/sveltejs/kit/pull/579))

## 2.0.0-next.39

### Patch Changes

- ac3669e: Move Vite config into svelte.config.cjs ([#569](https://github.com/sveltejs/kit/pull/569))

## 2.0.0-next.38

### Patch Changes

- c04887c: create-svelte: Include globals.d.ts in tsconfig ([#549](https://github.com/sveltejs/kit/pull/549))

## 2.0.0-next.37

### Patch Changes

- c76c9bf: Upgrade Vite ([#544](https://github.com/sveltejs/kit/pull/544))
- ab28c0a: create-svelte: Remove duplicate types ([#538](https://github.com/sveltejs/kit/pull/538))

## 2.0.0-next.36

### Patch Changes

- 0da62eb: create-svelte: Include missing ts-template ([#535](https://github.com/sveltejs/kit/pull/535))

## 2.0.0-next.35

### Patch Changes

- bb01514: Actually fix $component => $lib transition ([#529](https://github.com/sveltejs/kit/pull/529))

## 2.0.0-next.34

### Patch Changes

- 848687c: Fix location of example `Counter.svelte` component ([#522](https://github.com/sveltejs/kit/pull/522))

## 2.0.0-next.33

### Patch Changes

- f7dc6ad: Fix typo in template app
- 5554acc: Add \$lib alias ([#511](https://github.com/sveltejs/kit/pull/511))
- c0ed7a8: create-svelte: globals.d.ts TSDoc fixes, add vite/client types to js/tsconfig ([#517](https://github.com/sveltejs/kit/pull/517))

## 2.0.0-next.32

### Patch Changes

- 97b7ea4: jsconfig for js projects ([#510](https://github.com/sveltejs/kit/pull/510))

## 2.0.0-next.31

### Patch Changes

- c3cf3f3: Bump deps ([#492](https://github.com/sveltejs/kit/pull/492))
- 625747d: create-svelte: bundle production dependencies for SSR ([#486](https://github.com/sveltejs/kit/pull/486))

## 2.0.0-next.30

### Patch Changes

- b800049: Include type declarations ([#442](https://github.com/sveltejs/kit/pull/442))

## 2.0.0-next.29

### Patch Changes

- 15dd6d6: Fix setup to include vite ([#415](https://github.com/sveltejs/kit/pull/415))

## 2.0.0-next.28

### Patch Changes

- Use Vite

## 2.0.0-next.27

### Patch Changes

- Convert everything to ESM

## 2.0.0-next.26

### Patch Changes

- 00cbaf6: Rename `_.config.js` to `_.config.cjs` ([#356](https://github.com/sveltejs/kit/pull/356))

## 2.0.0-next.25

### Patch Changes

- c9d8d4f: Render to #svelte by default

## 2.0.0-next.24

### Patch Changes

- 0e45255: Move options behind kit namespace, change paths -> kit.files ([#236](https://github.com/sveltejs/kit/pull/236))

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
- 0904e22: rename svelte CLI to svelte-kit ([#186](https://github.com/sveltejs/kit/pull/186))

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
