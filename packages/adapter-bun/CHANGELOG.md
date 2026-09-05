# @sveltejs/adapter-bun

## 1.0.0-next.2

### Major Changes

- breaking: require Bun 1.4, which routes `HEAD` to `GET` handlers and settles `stop()` after a force close ([#16880](https://github.com/sveltejs/kit/pull/16880))

### Patch Changes

- fix: build apps that use server instrumentation ([#16898](https://github.com/sveltejs/kit/pull/16898))
- Updated dependencies [[`ff8cdd4`](https://github.com/sveltejs/kit/commit/ff8cdd4df8f6a0ee26c25854aa0656f2dc968caf), [`723572c`](https://github.com/sveltejs/kit/commit/723572c76053ebcae02b19166fe7400f45175c70), [`3b8e034`](https://github.com/sveltejs/kit/commit/3b8e034d62f1372f0e450da88c0705bd9828a816), [`f2c5102`](https://github.com/sveltejs/kit/commit/f2c5102079c80c904b3fe165666813023248facc), [`c66a6ed`](https://github.com/sveltejs/kit/commit/c66a6ed5bb6ba4594b0a952744a1d9c7e457b001), [`428e5ef`](https://github.com/sveltejs/kit/commit/428e5efeedba49ccd42d43f85e53707f6704931c)]:
  - @sveltejs/kit@3.0.0-next.26

## 1.0.0-next.1

### Minor Changes

- feat: add a Bun-native adapter with static file serving and single-executable support ([#16695](https://github.com/sveltejs/kit/pull/16695))

### Patch Changes

- Updated dependencies [[`9b3d195`](https://github.com/sveltejs/kit/commit/9b3d1955cb40042cbc411637dab3064ddfa6b1a5), [`385d378`](https://github.com/sveltejs/kit/commit/385d378dd1281e1b69417bf4980a169d67a49314), [`3782448`](https://github.com/sveltejs/kit/commit/37824483ca6ccf802942740f0da31b149d09e077), [`d0d3a33`](https://github.com/sveltejs/kit/commit/d0d3a33535cd2f3db1ed09680ccb34624b3abb77), [`4b7a483`](https://github.com/sveltejs/kit/commit/4b7a4830e962ee404161197b3b016182c376ed61), [`e325d7d`](https://github.com/sveltejs/kit/commit/e325d7dfa4313c889d3f9ebea9e70552722c427e), [`4f63c79`](https://github.com/sveltejs/kit/commit/4f63c799ab8dd9ae01eb301d7a9f5d712b724d23)]:
  - @sveltejs/kit@3.0.0-next.25

## 1.0.0-next.0

### Patch Changes

- Initial release
