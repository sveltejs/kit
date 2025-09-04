# @sveltejs/adapter-cloudflare

## 7.2.3
### Patch Changes


- fix: improve the error message when `read(...)` fails ([#14306](https://github.com/sveltejs/kit/pull/14306))

## 7.2.2
### Patch Changes


- chore: update error message link to the Workers Sites migration guide ([#14237](https://github.com/sveltejs/kit/pull/14237))

- Updated dependencies [[`b2c5d02`](https://github.com/sveltejs/kit/commit/b2c5d02994a6d83275d6fb3645e6f9a2518c8d20), [`0bf6185`](https://github.com/sveltejs/kit/commit/0bf6185748d7b777fa8b8d37cef331be92ecedde), [`b2c5d02`](https://github.com/sveltejs/kit/commit/b2c5d02994a6d83275d6fb3645e6f9a2518c8d20), [`c5f7139`](https://github.com/sveltejs/kit/commit/c5f713951e41af2000f21929d42eb9d30c9d3a5c)]:
  - @sveltejs/kit@2.34.1

## 7.2.1
### Patch Changes


- fix: avoid erroring on builder properties that only exist on the latest version of SvelteKit ([#14233](https://github.com/sveltejs/kit/pull/14233))

- Updated dependencies [[`f2db41c`](https://github.com/sveltejs/kit/commit/f2db41c0d3a0aefbb080ab6a9aa5822b3e41625c)]:
  - @sveltejs/kit@2.31.1

## 7.2.0
### Minor Changes


- feat: add `instrumentation.server.ts` for tracing and observability setup ([#13899](https://github.com/sveltejs/kit/pull/13899))


### Patch Changes

- Updated dependencies [[`f635678`](https://github.com/sveltejs/kit/commit/f63567812505597b1edc3e01010eca622b03b126), [`f635678`](https://github.com/sveltejs/kit/commit/f63567812505597b1edc3e01010eca622b03b126)]:
  - @sveltejs/kit@2.31.0

## 7.1.3
### Patch Changes


- chore: add `.git` to the end of `package.json` repository url ([#14134](https://github.com/sveltejs/kit/pull/14134))

- Updated dependencies [[`c968aef`](https://github.com/sveltejs/kit/commit/c968aef5727f978244d5160657b4a7ac651384ae)]:
  - @sveltejs/kit@2.27.3

## 7.1.2
### Patch Changes


- fix: resolve the absolute path of the Wrangler config setting `assets.directory` in case the config file is in a different directory than the root project ([#14036](https://github.com/sveltejs/kit/pull/14036))

- Updated dependencies [[`793ae28`](https://github.com/sveltejs/kit/commit/793ae28a339ca33b7e27f14158b1726bfeedd729)]:
  - @sveltejs/kit@2.27.0

## 7.1.1
### Patch Changes


- fix: support assets-only workers in wrangler validation ([#14019](https://github.com/sveltejs/kit/pull/14019))

- Updated dependencies [[`fda0165`](https://github.com/sveltejs/kit/commit/fda0165804011d221bb196a26565eea3e08b9d42)]:
  - @sveltejs/kit@2.25.2

## 7.1.0
### Minor Changes


- feat: add support for `read` imported from `$app/server` ([#13859](https://github.com/sveltejs/kit/pull/13859))


### Patch Changes


- fix: include missing utils file ([#14009](https://github.com/sveltejs/kit/pull/14009))


- fix: correctly warn users when assets key is missing ([#13844](https://github.com/sveltejs/kit/pull/13844))

- Updated dependencies [[`e5ce8bb`](https://github.com/sveltejs/kit/commit/e5ce8bb42ea020b88bd0a4ff18dc600745657541), [`cf88369`](https://github.com/sveltejs/kit/commit/cf883692fa0e163cff6b1a2f9b17a568af14124d)]:
  - @sveltejs/kit@2.25.0

## 7.0.5
### Patch Changes


- fix: deprecate `platform.context` in favor of `platform.ctx` to align with Cloudflare's naming convention ([#13856](https://github.com/sveltejs/kit/pull/13856))

- Updated dependencies [[`bcdaf21`](https://github.com/sveltejs/kit/commit/bcdaf215c2182524e7678a1049a5f1ccbbe71e21)]:
  - @sveltejs/kit@2.22.3

## 7.0.4
### Patch Changes


- fix: address build failure when using `paths.base` (#13769) ([#13846](https://github.com/sveltejs/kit/pull/13846))

- Updated dependencies [[`6a6538c4bd937667a56ef5f6673cdef3f2ea7a77`](https://github.com/sveltejs/kit/commit/6a6538c4bd937667a56ef5f6673cdef3f2ea7a77), [`6261a877ae97ff85d07277c51391d925ed1bd096`](https://github.com/sveltejs/kit/commit/6261a877ae97ff85d07277c51391d925ed1bd096), [`e7b57e74bdea976ae070562bda76d4bb78cdb6da`](https://github.com/sveltejs/kit/commit/e7b57e74bdea976ae070562bda76d4bb78cdb6da), [`408e1f5c2ae593b460861098e8e01f945af395ab`](https://github.com/sveltejs/kit/commit/408e1f5c2ae593b460861098e8e01f945af395ab), [`c6cd8c3a5ed96d423a65af5cb5468e3e963cfb54`](https://github.com/sveltejs/kit/commit/c6cd8c3a5ed96d423a65af5cb5468e3e963cfb54), [`1a406752aafc2b80d9ccb49f15ebc10301c84480`](https://github.com/sveltejs/kit/commit/1a406752aafc2b80d9ccb49f15ebc10301c84480), [`6c442395a8e6656ff49ecd4041d8e12ed65e80dd`](https://github.com/sveltejs/kit/commit/6c442395a8e6656ff49ecd4041d8e12ed65e80dd)]:
  - @sveltejs/kit@2.21.3

## 7.0.3
### Patch Changes


- chore(deps): upgrade @cloudflare/workers-types to 4.20250507.0 ([#13773](https://github.com/sveltejs/kit/pull/13773))

## 7.0.2
### Patch Changes


- chore(deps): upgrade @cloudflare/workers-types to 4.20250415.0 ([#13716](https://github.com/sveltejs/kit/pull/13716))

- Updated dependencies [[`c51fb554416e0c4a21655c1d79e834f69743d1d5`](https://github.com/sveltejs/kit/commit/c51fb554416e0c4a21655c1d79e834f69743d1d5)]:
  - @sveltejs/kit@2.20.8

## 7.0.1
### Patch Changes


- fix: correctly write the worker to the `pages_build_output_dir` path if set in the Wrangler configuration path ([#13671](https://github.com/sveltejs/kit/pull/13671))


- fix: correctly resolve paths provided by the Wrangler config on Windows ([#13671](https://github.com/sveltejs/kit/pull/13671))

- Updated dependencies [[`7fd7bcb7142e7d0d2dd64174fa1a94d56a45d643`](https://github.com/sveltejs/kit/commit/7fd7bcb7142e7d0d2dd64174fa1a94d56a45d643)]:
  - @sveltejs/kit@2.20.4

## 7.0.0
### Major Changes


- feat: support specifically building for Cloudflare Workers Static Assets ([#13634](https://github.com/sveltejs/kit/pull/13634))


### Patch Changes


- chore: remove `esbuild` as dependency ([#13633](https://github.com/sveltejs/kit/pull/13633))

- Updated dependencies [[`370e9f95c1d6efd5393f73d2dbef68143b27f681`](https://github.com/sveltejs/kit/commit/370e9f95c1d6efd5393f73d2dbef68143b27f681)]:
  - @sveltejs/kit@2.20.3

## 6.0.1
### Patch Changes


- fix: revert writing server files to the cloudflare build directory ([#13622](https://github.com/sveltejs/kit/pull/13622))

## 6.0.0
### Major Changes


- fix: copy the `_headers` and `_redirects` files from the project root instead of the `/static` directory ([#13227](https://github.com/sveltejs/kit/pull/13227))


### Patch Changes


- fix: write server files to the cloudflare build directory ([#13610](https://github.com/sveltejs/kit/pull/13610))

## 5.1.0
### Minor Changes


- feat: support wrangler 4 ([#13580](https://github.com/sveltejs/kit/pull/13580))


### Patch Changes

- Updated dependencies [[`001bc04dece9b0983efc2187225772c19d135345`](https://github.com/sveltejs/kit/commit/001bc04dece9b0983efc2187225772c19d135345)]:
  - @sveltejs/kit@2.19.2

## 5.0.3
### Patch Changes


- fix: exclude the dynamic route `/_app/env.js` from the adapter config `routes.exclude` special value `<build>` ([#13411](https://github.com/sveltejs/kit/pull/13411))

- Updated dependencies [[`9612a60a0277aef0ab4723a0e7ed8dd03a7ffb95`](https://github.com/sveltejs/kit/commit/9612a60a0277aef0ab4723a0e7ed8dd03a7ffb95), [`3d88ae33fc14b08a1d48c2cb7315739c8cfcd9fd`](https://github.com/sveltejs/kit/commit/3d88ae33fc14b08a1d48c2cb7315739c8cfcd9fd)]:
  - @sveltejs/kit@2.17.2

## 5.0.2
### Patch Changes


- fix: prevent Vitest from hanging, which was not fully addressed in [#12830](https://github.com/sveltejs/kit/pull/12830) ([#13373](https://github.com/sveltejs/kit/pull/13373))

- Updated dependencies [[`09296d0f19c8d1ff57d699e637bd1beabb69d438`](https://github.com/sveltejs/kit/commit/09296d0f19c8d1ff57d699e637bd1beabb69d438), [`d62ed39a431f0db3db4dd90bf6b17ed2a2a2de79`](https://github.com/sveltejs/kit/commit/d62ed39a431f0db3db4dd90bf6b17ed2a2a2de79), [`f30352f874790b9de0bd0eba985a21aef23e158e`](https://github.com/sveltejs/kit/commit/f30352f874790b9de0bd0eba985a21aef23e158e), [`180fa3467e195065c0a25206c6328a908e6952d7`](https://github.com/sveltejs/kit/commit/180fa3467e195065c0a25206c6328a908e6952d7), [`5906e9708965b848b468d0014999c36272dc8d50`](https://github.com/sveltejs/kit/commit/5906e9708965b848b468d0014999c36272dc8d50), [`d62ed39a431f0db3db4dd90bf6b17ed2a2a2de79`](https://github.com/sveltejs/kit/commit/d62ed39a431f0db3db4dd90bf6b17ed2a2a2de79)]:
  - @sveltejs/kit@2.17.0

## 5.0.1
### Patch Changes


- fix: prevent vitest from hanging ([#12830](https://github.com/sveltejs/kit/pull/12830))

- Updated dependencies [[`1bedcc1cfc1f2d85946c1423f60faa8a2a56148b`](https://github.com/sveltejs/kit/commit/1bedcc1cfc1f2d85946c1423f60faa8a2a56148b), [`e201fa9380a00e072a80a2dcab56de3d77e5b67c`](https://github.com/sveltejs/kit/commit/e201fa9380a00e072a80a2dcab56de3d77e5b67c), [`f3f08582d41b08c3fd1daf742e5703d9cdca7823`](https://github.com/sveltejs/kit/commit/f3f08582d41b08c3fd1daf742e5703d9cdca7823), [`d4bcfccb4503b12fe76140dbb6cfddc81f9419fc`](https://github.com/sveltejs/kit/commit/d4bcfccb4503b12fe76140dbb6cfddc81f9419fc), [`d09bc033123903f359c1ad6fd3a6d8d7fc19298a`](https://github.com/sveltejs/kit/commit/d09bc033123903f359c1ad6fd3a6d8d7fc19298a)]:
  - @sveltejs/kit@2.15.3

## 5.0.0
### Major Changes


- feat: remove esbuild step ([#13132](https://github.com/sveltejs/kit/pull/13132))


### Patch Changes

- Updated dependencies [[`12ce7eb19fb57907e3db29ef981a8c7a0afc4b6f`](https://github.com/sveltejs/kit/commit/12ce7eb19fb57907e3db29ef981a8c7a0afc4b6f), [`528af75f846f971ef64e4d109ac5e22fca046b90`](https://github.com/sveltejs/kit/commit/528af75f846f971ef64e4d109ac5e22fca046b90)]:
  - @sveltejs/kit@2.15.1

## 4.9.0
### Minor Changes


- feat: generate `.assetsignore` file for use with Cloudflare Workers Static Assets ([#13109](https://github.com/sveltejs/kit/pull/13109))


### Patch Changes

- Updated dependencies [[`20f2720aa3455f38fa2630a33d52f7532da27fce`](https://github.com/sveltejs/kit/commit/20f2720aa3455f38fa2630a33d52f7532da27fce)]:
  - @sveltejs/kit@2.13.0

## 4.8.0
### Minor Changes


- chore: upgrade esbuild to 0.24.0 ([#12270](https://github.com/sveltejs/kit/pull/12270))


### Patch Changes

- Updated dependencies [[`d030f4bb285e70844d09b3f0c87809bae43014b8`](https://github.com/sveltejs/kit/commit/d030f4bb285e70844d09b3f0c87809bae43014b8), [`67dd214863cbc5852eb0e8512efbb7bad5358e8a`](https://github.com/sveltejs/kit/commit/67dd214863cbc5852eb0e8512efbb7bad5358e8a)]:
  - @sveltejs/kit@2.9.0

## 4.7.4
### Patch Changes


- docs: update URLs for new svelte.dev site ([#12857](https://github.com/sveltejs/kit/pull/12857))

- Updated dependencies [[`dcbe4222a194c5f90cfc0fc020cf065f7a4e4c46`](https://github.com/sveltejs/kit/commit/dcbe4222a194c5f90cfc0fc020cf065f7a4e4c46), [`4cdbf76fbbf0c0ce7f574ef69c8daddcf954d39d`](https://github.com/sveltejs/kit/commit/4cdbf76fbbf0c0ce7f574ef69c8daddcf954d39d), [`3a9b78f04786898ca93f6d4b75ab18d26bc45192`](https://github.com/sveltejs/kit/commit/3a9b78f04786898ca93f6d4b75ab18d26bc45192), [`723eb8b31e6a22c82f730c30e485386c8676b746`](https://github.com/sveltejs/kit/commit/723eb8b31e6a22c82f730c30e485386c8676b746), [`8ec471c875345b751344e67580ff1b772ef2735b`](https://github.com/sveltejs/kit/commit/8ec471c875345b751344e67580ff1b772ef2735b)]:
  - @sveltejs/kit@2.7.3

## 4.7.3
### Patch Changes


- fix: correctly handle relative paths when fetching assets on the server ([#12113](https://github.com/sveltejs/kit/pull/12113))

- Updated dependencies [[`df48fc6ede3859beabaae9fd7c6f722215bb8a42`](https://github.com/sveltejs/kit/commit/df48fc6ede3859beabaae9fd7c6f722215bb8a42), [`5780deba8e3ebd0e2b0abea029068ad0c6daf6ad`](https://github.com/sveltejs/kit/commit/5780deba8e3ebd0e2b0abea029068ad0c6daf6ad), [`6f9aefdb8699fc126d76a88471602cb9a80822eb`](https://github.com/sveltejs/kit/commit/6f9aefdb8699fc126d76a88471602cb9a80822eb), [`8aa95b4b3431e79f62f580abdcdcb157b4de86cd`](https://github.com/sveltejs/kit/commit/8aa95b4b3431e79f62f580abdcdcb157b4de86cd)]:
  - @sveltejs/kit@2.7.0

## 4.7.2
### Patch Changes


- chore: configure provenance in a simpler manner ([#12570](https://github.com/sveltejs/kit/pull/12570))

- Updated dependencies [[`087a43d391fc38b8c008fb39a804dc6988974101`](https://github.com/sveltejs/kit/commit/087a43d391fc38b8c008fb39a804dc6988974101)]:
  - @sveltejs/kit@2.5.22

## 4.7.1
### Patch Changes


- chore: package provenance ([#12567](https://github.com/sveltejs/kit/pull/12567))

- Updated dependencies [[`4930a8443caa53bcecee7b690cd28e429b1c8a20`](https://github.com/sveltejs/kit/commit/4930a8443caa53bcecee7b690cd28e429b1c8a20)]:
  - @sveltejs/kit@2.5.21

## 4.7.0
### Minor Changes


- feat: generate static `_redirects` for Cloudflare Pages ([#12199](https://github.com/sveltejs/kit/pull/12199))


### Patch Changes


- fix: correctly return static assets if base path is set ([#12075](https://github.com/sveltejs/kit/pull/12075))

## 4.6.1
### Patch Changes


- fix: copy `.eot`, `.otf`, `.ttf`, `.woff`, and `woff2` font files when bundling ([#12439](https://github.com/sveltejs/kit/pull/12439))

## 4.6.0
### Minor Changes


- chore(deps): upgrade to esbuild 0.21 ([#12415](https://github.com/sveltejs/kit/pull/12415))


### Patch Changes

- Updated dependencies [[`84298477a014ec471839adf7a4448d91bc7949e4`](https://github.com/sveltejs/kit/commit/84298477a014ec471839adf7a4448d91bc7949e4), [`5645614f497931f587b7cb8b3c885fce892a6a72`](https://github.com/sveltejs/kit/commit/5645614f497931f587b7cb8b3c885fce892a6a72), [`84298477a014ec471839adf7a4448d91bc7949e4`](https://github.com/sveltejs/kit/commit/84298477a014ec471839adf7a4448d91bc7949e4)]:
  - @sveltejs/kit@2.5.18

## 4.5.0

### Minor Changes

- feat: validate that no `_routes.json` is present to avoid overwriting it ([#12360](https://github.com/sveltejs/kit/pull/12360))

### Patch Changes

- Updated dependencies [[`121836fcbf6c615fd18c79a12203613ddbe49acf`](https://github.com/sveltejs/kit/commit/121836fcbf6c615fd18c79a12203613ddbe49acf)]:
  - @sveltejs/kit@2.5.17

## 4.4.1

### Patch Changes

- chore: add keywords for discovery in npm search ([#12330](https://github.com/sveltejs/kit/pull/12330))

- Updated dependencies [[`25acb1d9fce998dccd8050b93cf4142c2b082611`](https://github.com/sveltejs/kit/commit/25acb1d9fce998dccd8050b93cf4142c2b082611), [`642c4a4aff4351b786fe6274aa2f0bf7d905faf9`](https://github.com/sveltejs/kit/commit/642c4a4aff4351b786fe6274aa2f0bf7d905faf9), [`0a0e9aa897123ebec50af08e9385b2ca4fc5bb28`](https://github.com/sveltejs/kit/commit/0a0e9aa897123ebec50af08e9385b2ca4fc5bb28)]:
  - @sveltejs/kit@2.5.11

## 4.4.0

### Minor Changes

- chore(deps): upgrade esbuild ([#12118](https://github.com/sveltejs/kit/pull/12118))

### Patch Changes

- Updated dependencies [[`bbab296f6fcc05af6b999182798bcdedabbaa4c9`](https://github.com/sveltejs/kit/commit/bbab296f6fcc05af6b999182798bcdedabbaa4c9)]:
  - @sveltejs/kit@2.5.6

## 4.3.0

### Minor Changes

- feat: support platform emulation configuration via the `platformProxy` adapter option ([#12011](https://github.com/sveltejs/kit/pull/12011))

## 4.2.1

### Patch Changes

- fix: add `workerd` to esbuild conditions ([#12069](https://github.com/sveltejs/kit/pull/12069))

## 4.2.0

### Minor Changes

- feat: emulate Cloudflare Workers bindings and incoming request properties in `event.platform` for `dev` and `preview` ([#11974](https://github.com/sveltejs/kit/pull/11974))

### Patch Changes

- Updated dependencies [[`4562275ed42964148df03c79434172024897c08c`](https://github.com/sveltejs/kit/commit/4562275ed42964148df03c79434172024897c08c)]:
  - @sveltejs/kit@2.5.4

## 4.1.0

### Minor Changes

- feat: more helpful errors when using incompatible Node modules ([#11673](https://github.com/sveltejs/kit/pull/11673))

- feat: support compatible node modules without prefixes ([#11672](https://github.com/sveltejs/kit/pull/11672))

- feat: Add Node.js compatibility ([#10544](https://github.com/sveltejs/kit/pull/10544))

### Patch Changes

- Updated dependencies [[`288f731c8a5b20cadb9e219f9583f3f16bf8c7b8`](https://github.com/sveltejs/kit/commit/288f731c8a5b20cadb9e219f9583f3f16bf8c7b8)]:
  - @sveltejs/kit@2.4.0

## 4.0.2

### Patch Changes

- chore(deps): update dependency worktop to v0.8.0-next.18 ([#11618](https://github.com/sveltejs/kit/pull/11618))

## 4.0.1

### Patch Changes

- chore: upgrade esbuild to 0.19.11 ([#11632](https://github.com/sveltejs/kit/pull/11632))

## 4.0.0

### Major Changes

- breaking: generate plaintext 404.html instead of SPA-style fallback page ([#11596](https://github.com/sveltejs/kit/pull/11596))

### Patch Changes

- Updated dependencies [[`2137717ea8592c310ada93490feabbd9eea125ea`](https://github.com/sveltejs/kit/commit/2137717ea8592c310ada93490feabbd9eea125ea)]:
  - @sveltejs/kit@2.3.3

## 3.0.2

### Patch Changes

- fix: serve static files in `_app` from function, if not already handled ([#11593](https://github.com/sveltejs/kit/pull/11593))

- Updated dependencies [[`553e14c8320ad9c6ebb3c554c35f1482755c9555`](https://github.com/sveltejs/kit/commit/553e14c8320ad9c6ebb3c554c35f1482755c9555), [`48576de0dc8b1fbbab7954113004540ea4e76935`](https://github.com/sveltejs/kit/commit/48576de0dc8b1fbbab7954113004540ea4e76935)]:
  - @sveltejs/kit@2.3.2

## 3.0.1

### Patch Changes

- chore: update primary branch from master to main ([`47779436c5f6c4d50011d0ef8b2709a07c0fec5d`](https://github.com/sveltejs/kit/commit/47779436c5f6c4d50011d0ef8b2709a07c0fec5d))

- Updated dependencies [[`47779436c5f6c4d50011d0ef8b2709a07c0fec5d`](https://github.com/sveltejs/kit/commit/47779436c5f6c4d50011d0ef8b2709a07c0fec5d), [`16961e8cd3fa6a7f382153b1ff056bc2aae9b31b`](https://github.com/sveltejs/kit/commit/16961e8cd3fa6a7f382153b1ff056bc2aae9b31b), [`197e01f95652f511160f38b37b9da73a124ecd48`](https://github.com/sveltejs/kit/commit/197e01f95652f511160f38b37b9da73a124ecd48), [`102e4a5ae5b29624302163faf5a20c94a64a5b2c`](https://github.com/sveltejs/kit/commit/102e4a5ae5b29624302163faf5a20c94a64a5b2c), [`f8e3d8b9728c9f1ab63389342c31d7246b6f9db6`](https://github.com/sveltejs/kit/commit/f8e3d8b9728c9f1ab63389342c31d7246b6f9db6)]:
  - @sveltejs/kit@2.0.4

## 3.0.0

### Major Changes

- breaking: require SvelteKit 2 ([#11316](https://github.com/sveltejs/kit/pull/11316))

- chore: upgrade esbuild ([#11122](https://github.com/sveltejs/kit/pull/11122))

## 2.3.4

### Patch Changes

- fix: retain URL query string for trailing slash redirects to prerendered pages ([#11142](https://github.com/sveltejs/kit/pull/11142))

- Updated dependencies [[`a7f8bdcfa`](https://github.com/sveltejs/kit/commit/a7f8bdcfabce5cda85dd073a21d0afb6138a7a08), [`a4d91304e`](https://github.com/sveltejs/kit/commit/a4d91304eebc08bf2e748d83a46d3548a546e3ab)]:
  - @sveltejs/kit@1.27.7

## 2.3.3

### Patch Changes

- fix: correctly include `config.kit.paths.base` ([#10604](https://github.com/sveltejs/kit/pull/10604))

- Updated dependencies [[`7c37a2fb3`](https://github.com/sveltejs/kit/commit/7c37a2fb3bff0f47f817bc8049b454abe591b8a0), [`998fe2f19`](https://github.com/sveltejs/kit/commit/998fe2f19833df4ffc08f29e924cc8e1591f7734), [`23721d1fb`](https://github.com/sveltejs/kit/commit/23721d1fbed04083069f07c068289282819ff4cb), [`32afba695`](https://github.com/sveltejs/kit/commit/32afba695088b946aefe96da75b36de9b0667fbe)]:
  - @sveltejs/kit@1.23.0

## 2.3.2

### Patch Changes

- fix: mark `cloudflare:` packages as external ([#10404](https://github.com/sveltejs/kit/pull/10404))

- Updated dependencies [[`0f0049810`](https://github.com/sveltejs/kit/commit/0f00498100361ef0a4ea8b0b4e8465e442fa22a6), [`6f36aefe1`](https://github.com/sveltejs/kit/commit/6f36aefe13bf55cfaef14166c60ecee989061ddd)]:
  - @sveltejs/kit@1.22.4

## 2.3.1

### Patch Changes

- chore: upgrade to esbuild 0.18.11 ([#10330](https://github.com/sveltejs/kit/pull/10330))

- Updated dependencies [[`23d1df702`](https://github.com/sveltejs/kit/commit/23d1df702f0fd77983040404352d8d83fd1dd8a1), [`486a971fe`](https://github.com/sveltejs/kit/commit/486a971fe7c375aae1585f1fa2505e28f86f4b8e)]:
  - @sveltejs/kit@1.22.2

## 2.3.0

### Minor Changes

- feat: add cloudflare's `request.cf` object to the `event.platform` property ([#9978](https://github.com/sveltejs/kit/pull/9978))

### Patch Changes

- Updated dependencies [[`4aa976e50`](https://github.com/sveltejs/kit/commit/4aa976e5018664ee333629c5f2f6edacab9d868a), [`c1d34584f`](https://github.com/sveltejs/kit/commit/c1d34584f2404b9c80a547c8138264cac2a813b6), [`1c0423b65`](https://github.com/sveltejs/kit/commit/1c0423b655b7d5909e405d9d15025dc75e71a04f), [`7499d8f31`](https://github.com/sveltejs/kit/commit/7499d8f31195473d2c955f1280e097ac95995efa), [`81af6baf9`](https://github.com/sveltejs/kit/commit/81af6baf9b6f6e8f14212958eb393677db09320a), [`86dd16cc1`](https://github.com/sveltejs/kit/commit/86dd16cc10c35c4b723a4e7f77e654452aa0965e), [`195e9ac22`](https://github.com/sveltejs/kit/commit/195e9ac2233776ecf1aff7dadbadd7226f68e8dd)]:
  - @sveltejs/kit@1.19.0

## 2.2.4

### Patch Changes

- fix: require explicit cache-control header for caching ([#9885](https://github.com/sveltejs/kit/pull/9885))

## 2.2.3

### Patch Changes

- fix: Copy .wasm files during build ([#9909](https://github.com/sveltejs/kit/pull/9909))

- Updated dependencies [[`50acb22ca`](https://github.com/sveltejs/kit/commit/50acb22caf2901283e044cdfda36db6f07b3e0ae), [`2e6da9496`](https://github.com/sveltejs/kit/commit/2e6da9496bdace2c65040b9d1845c44801ca868c), [`a81106b3a`](https://github.com/sveltejs/kit/commit/a81106b3a817829c41e048207d6253e63988c58c), [`a6338a0b1`](https://github.com/sveltejs/kit/commit/a6338a0b124f54bda7ba3fe64be1d6173e118d00), [`4a85b7f08`](https://github.com/sveltejs/kit/commit/4a85b7f0820d35c7830c00afe1df3c94fcbf8c3d), [`26d2b7f8f`](https://github.com/sveltejs/kit/commit/26d2b7f8f5ca29c60ef61b936ff86deaeb1636ce), [`bc70b4e63`](https://github.com/sveltejs/kit/commit/bc70b4e636fcbd9593356996bf737e014ff8c238), [`ab9f57721`](https://github.com/sveltejs/kit/commit/ab9f57721fca146af7c4eb41f4875fafa5dfc0d2)]:
  - @sveltejs/kit@1.17.0

## 2.2.2

### Patch Changes

- fix: respect response status code for caching in `adapter-cloudflare` ([#9820](https://github.com/sveltejs/kit/pull/9820))

## 2.2.1

### Patch Changes

- chore: update all dependencies with minor version bumps ([#9761](https://github.com/sveltejs/kit/pull/9761))

## 2.2.0

### Minor Changes

- feat: generate `404.html` ([#9294](https://github.com/sveltejs/kit/pull/9294))

- feat: use `es2022` target ([#9293](https://github.com/sveltejs/kit/pull/9293))

### Patch Changes

- Updated dependencies [[`2b647fd8`](https://github.com/sveltejs/kit/commit/2b647fd85be028bc5775894567ee8b13f91411a7), [`fbe4fe76`](https://github.com/sveltejs/kit/commit/fbe4fe768140abac09bd66edd12c77787cafc2c5), [`744dc81c`](https://github.com/sveltejs/kit/commit/744dc81c6b0d8cade087df733c6d3d3f1281e68c)]:
  - @sveltejs/kit@1.10.0

## 2.1.0

### Minor Changes

- feat: allow custom `include` and `exclude` rules in `_routes.json` ([#9111](https://github.com/sveltejs/kit/pull/9111))

## 2.0.2

### Patch Changes

- fix: exclude `_headers` and `_redirects` files from Cloudflare Pages static request list ([#9042](https://github.com/sveltejs/kit/pull/9042))

- fix: remove redundant cloudflare worker static asset serving ([#9040](https://github.com/sveltejs/kit/pull/9040))

- Updated dependencies [[`19c0e62a`](https://github.com/sveltejs/kit/commit/19c0e62a6bd281e656061b453973c35fa2dd9d3d)]:
  - @sveltejs/kit@1.5.7

## 2.0.1

### Patch Changes

- fix: correctly check URL pathname with Cloudflare adapter ([#8733](https://github.com/sveltejs/kit/pull/8733))

- Updated dependencies [[`eba8fb09`](https://github.com/sveltejs/kit/commit/eba8fb0929b35edea1ca7867b816abd184d8f8f7), [`c14f3aeb`](https://github.com/sveltejs/kit/commit/c14f3aeb32f3e78c8454e9b89f85a0650b7683c4)]:
  - @sveltejs/kit@1.3.6

## 2.0.0

### Major Changes

- breaking: append `_headers` instead of overwriting ([#8693](https://github.com/sveltejs/kit/pull/8693))

## 1.1.0

### Minor Changes

- feat: include as many static assets as possible in exclude list ([#8422](https://github.com/sveltejs/kit/pull/8422))

### Patch Changes

- Updated dependencies [[`06a56ae5`](https://github.com/sveltejs/kit/commit/06a56ae587795113b17fec559ab49c93f40861e8), [`06a56ae5`](https://github.com/sveltejs/kit/commit/06a56ae587795113b17fec559ab49c93f40861e8), [`2726e7c2`](https://github.com/sveltejs/kit/commit/2726e7c2d6d086e6200f9edecbeecf0d38eef873)]:
  - @sveltejs/kit@1.2.0

## 1.0.4

### Patch Changes

- docs: move adapter docs to site ([#8531](https://github.com/sveltejs/kit/pull/8531))

## 1.0.3

### Patch Changes

- chore: remove superfluous main field from package.json ([#8519](https://github.com/sveltejs/kit/pull/8519))

- Updated dependencies [[`7e2d3405`](https://github.com/sveltejs/kit/commit/7e2d34056e99f371e22406d941b764df365a2649)]:
  - @sveltejs/kit@1.1.1

## 1.0.2

### Patch Changes

- fix: don't load ambient worker types ([#8483](https://github.com/sveltejs/kit/pull/8483))

## 1.0.1

### Patch Changes

- docs: add note about inability to access file system at runtime ([#8441](https://github.com/sveltejs/kit/pull/8441))

- Updated dependencies [[`9c01c32e`](https://github.com/sveltejs/kit/commit/9c01c32ef72bbed630fadcb8283f8f8533ced5e1), [`b6ca02a6`](https://github.com/sveltejs/kit/commit/b6ca02a684dbf13a3138b552e2d2be64697f2254), [`130abe43`](https://github.com/sveltejs/kit/commit/130abe43cef2cfbaf922aa16b20cbd4332a07c15), [`c4137536`](https://github.com/sveltejs/kit/commit/c4137536f2c6572eaeec1a82ccea0852f5be6b98), [`40464efa`](https://github.com/sveltejs/kit/commit/40464efab172a17f0b637d7dadea30d77ef1ed10), [`ce028470`](https://github.com/sveltejs/kit/commit/ce0284708184198efdd30f3ff72fd579cef830b4)]:
  - @sveltejs/kit@1.0.12

## 1.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 1.0.0-next.45

### Patch Changes

- breaking: remove warnings/errors about removed/changed APIs ([#8019](https://github.com/sveltejs/kit/pull/8019))
- Updated dependencies [[`f42604a2`](https://github.com/sveltejs/kit/commit/f42604a2b4c04026d3d8bad95807720b79529539)]:
  - @sveltejs/kit@1.0.0-next.589

## 1.0.0-next.44

### Patch Changes

- chore: add peerDependencies, add more specific next version ([#8141](https://github.com/sveltejs/kit/pull/8141))

## 1.0.0-next.43

### Patch Changes

- fix: revert platform change from browser to neutral ([#8122](https://github.com/sveltejs/kit/pull/8122))

## 1.0.0-next.42

### Patch Changes

- fix: set esbuild platform to neutral ([#8083](https://github.com/sveltejs/kit/pull/8083))

## 1.0.0-next.41

### Patch Changes

- update esbuild to ^0.16.3 ([#7543](https://github.com/sveltejs/kit/pull/7543))

## 1.0.0-next.40

### Patch Changes

- update dependencies ([#7355](https://github.com/sveltejs/kit/pull/7355))

## 1.0.0-next.39

### Patch Changes

- Use config.kit.paths.base prefix for static assets ([#4448](https://github.com/sveltejs/kit/pull/4448))

## 1.0.0-next.38

### Patch Changes

- Ensure all excluded paths in `_routes.json` start with / ([#6952](https://github.com/sveltejs/kit/pull/6952))

## 1.0.0-next.37

### Patch Changes

- Support Cloudflare Pages `_routes.json` specification ([#6530](https://github.com/sveltejs/kit/pull/6530))

## 1.0.0-next.36

### Patch Changes

- Include ambient.d.ts files in adapter packages. ([#6917](https://github.com/sveltejs/kit/pull/6917))

## 1.0.0-next.35

### Patch Changes

- fix: return 404 instead of 200 for missing assets ([#6879](https://github.com/sveltejs/kit/pull/6879))

## 1.0.0-next.34

### Patch Changes

- chore: bump esbuild ([#6829](https://github.com/sveltejs/kit/pull/6829))

## 1.0.0-next.33

### Patch Changes

- Update to esbuild 0.15 ([#6740](https://github.com/sveltejs/kit/pull/6740))

## 1.0.0-next.32

### Patch Changes

- feat: Moved hooks.js initialization from Server.respond into Server.init ([#6179](https://github.com/sveltejs/kit/pull/6179))

## 1.0.0-next.31

### Patch Changes

- Initialise `env` ([#5663](https://github.com/sveltejs/kit/pull/5663))

## 1.0.0-next.30

### Patch Changes

- breaking: remove writeStatic to align with Vite ([#5618](https://github.com/sveltejs/kit/pull/5618))

## 1.0.0-next.29

### Patch Changes

- Update dependencies ([#5005](https://github.com/sveltejs/kit/pull/5005))

## 1.0.0-next.28

### Patch Changes

- breaking: Don't pass arbitrary options to esbuild ([#4639](https://github.com/sveltejs/kit/pull/4639))

## 1.0.0-next.27

### Patch Changes

- Expose App interfaces ([#5386](https://github.com/sveltejs/kit/pull/5386))

## 1.0.0-next.26

### Patch Changes

- chore: upgrade TypeScript to 4.7.4 ([#5414](https://github.com/sveltejs/kit/pull/5414))

## 1.0.0-next.25

### Patch Changes

- Expose Cloudflare Worker Cache API through `caches` in Platform ([#5081](https://github.com/sveltejs/kit/pull/5081))

## 1.0.0-next.24

### Patch Changes

- Generate sourcemaps for server-side functions when bundling with esbuild ([#5258](https://github.com/sveltejs/kit/pull/5258))

## 1.0.0-next.23

### Patch Changes

- Update dependencies ([#5121](https://github.com/sveltejs/kit/pull/5121))

## 1.0.0-next.22

### Patch Changes

- Update adapter entrypoint typings to be NodeNext/ESNext-compatible ([#5111](https://github.com/sveltejs/kit/pull/5111))

## 1.0.0-next.21

### Patch Changes

- only serve `_app/immutable` with immutable cache header, not `_app/version.json` ([#5051](https://github.com/sveltejs/kit/pull/5051))

## 1.0.0-next.20

### Patch Changes

- Add types to pkg.exports ([#5045](https://github.com/sveltejs/kit/pull/5045))

## 1.0.0-next.19

### Patch Changes

- breaking: Remove try-catch around server.respond ([#4738](https://github.com/sveltejs/kit/pull/4738))

## 1.0.0-next.18

### Patch Changes

- chore: more restrictive cache lookup & save conditions ([#4669](https://github.com/sveltejs/kit/pull/4669))

## 1.0.0-next.17

### Patch Changes

- Check for Cache match sooner; use `worktop` for types & Cache operations ([#4453](https://github.com/sveltejs/kit/pull/4453))
- Add cloudflare cache to store responses with a cache header. ([#4412](https://github.com/sveltejs/kit/pull/4412))

## 1.0.0-next.16

### Patch Changes

- Provide getClientAddress function ([#4289](https://github.com/sveltejs/kit/pull/4289))

## 1.0.0-next.15

### Patch Changes

- breaking: replace builder.prerender() with builder.writePrerendered() and builder.prerendered ([#4192](https://github.com/sveltejs/kit/pull/4192)) ([#4229](https://github.com/sveltejs/kit/pull/4229))

## 1.0.0-next.14

### Patch Changes

- Bumping versions again ([#4090](https://github.com/sveltejs/kit/pull/4090))

## 1.0.0-next.13

### Patch Changes

- Attempt to force @next version bump ([#4088](https://github.com/sveltejs/kit/pull/4088))

## 1.0.0-next.12

### Patch Changes

- breaking: rename `app.render` to `server.respond` ([#4034](https://github.com/sveltejs/kit/pull/4034))

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
- Remove esbuild options ([#2931](https://github.com/sveltejs/kit/pull/2931))
- Update adapters to provide app.render with a url ([#3133](https://github.com/sveltejs/kit/pull/3133))

## 1.0.0-next.4

### Patch Changes

- Updated Cloudflare adapter to allow static files with spaces (eg. "Example File.pdf") to be accessed. ([#3047](https://github.com/sveltejs/kit/pull/3047))

## 1.0.0-next.3

### Patch Changes

- update to esbuild 0.13.15 and other dependency updates ([#2957](https://github.com/sveltejs/kit/pull/2957))

## 1.0.0-next.2

### Patch Changes

- Allow `npm publish` to succeed via `publishConfig.access` config ([#2834](https://github.com/sveltejs/kit/pull/2834))

## 1.0.0-next.1

### Patch Changes

- Add new `adapter-cloudflare` package for Cloudflare Pages with Workers integration ([#2815](https://github.com/sveltejs/kit/pull/2815))

## 1.0.0-next.0

- Initial release
