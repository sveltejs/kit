# @sveltejs/adapter-bun

## 1.0.0-next.3

### Major Changes

- breaking: build the server with Vite instead of a second `Bun.build` pass, keeping production dependencies external; `buildOptions` now only applies to executables ([#17120](https://github.com/sveltejs/kit/pull/17120))

### Patch Changes

- Updated dependencies [[`abf47df`](https://github.com/sveltejs/kit/commit/abf47df887f914f09c39a7f771d32cdd55fb346d), [`df3f003`](https://github.com/sveltejs/kit/commit/df3f0034b541701bd3319225f4e6003579d4ebd6), [`3c044cd`](https://github.com/sveltejs/kit/commit/3c044cda5c356dede92167dcca549cd58e73e61f), [`509dd14`](https://github.com/sveltejs/kit/commit/509dd146696b2c77ae3ac8ac2435773864520016), [`5d8722c`](https://github.com/sveltejs/kit/commit/5d8722c60977efb6e4606fefd9750c2349af410a), [`462111a`](https://github.com/sveltejs/kit/commit/462111a1411551386c6e1aa6c14f967f4ae875c2), [`9f3342f`](https://github.com/sveltejs/kit/commit/9f3342fb9305d1fd731a49497bec894469073fd0), [`8614b01`](https://github.com/sveltejs/kit/commit/8614b016e3be4247cb1aae615870f4c23a0622b3), [`65f93c8`](https://github.com/sveltejs/kit/commit/65f93c83b29f47ebc05bfdeac53f8c92c8d522e1), [`147f09a`](https://github.com/sveltejs/kit/commit/147f09ab7397727f17b5f35ff7535eb1a089180f), [`68c6ef9`](https://github.com/sveltejs/kit/commit/68c6ef97fad9baf6c883e203b1ceb686e2ca74a1), [`377fc5d`](https://github.com/sveltejs/kit/commit/377fc5dd93054ba01ec0e9623036735ff7aadfb5), [`4ac8c9b`](https://github.com/sveltejs/kit/commit/4ac8c9b4b9f015769f81adb941c85cf42fc17424), [`4c812c8`](https://github.com/sveltejs/kit/commit/4c812c808c6b62c78b89fb0021dcfe45e06afcc7), [`fbbb4c7`](https://github.com/sveltejs/kit/commit/fbbb4c7d3c4ff3a3792a58db26c6be77996a392d), [`c6ba86b`](https://github.com/sveltejs/kit/commit/c6ba86ba7983a53f0d1e16c0a6462009d5245d4d), [`7847e4e`](https://github.com/sveltejs/kit/commit/7847e4e27f17a0a94b29f88d79050d704436957c), [`f8258ee`](https://github.com/sveltejs/kit/commit/f8258ee5e042d48d198cca3f35982e90db0077cb), [`4da6320`](https://github.com/sveltejs/kit/commit/4da6320db8d70b73b93e142e4bb6ba9173be3b97), [`b21766f`](https://github.com/sveltejs/kit/commit/b21766f362e39f51cb4ae8f894ea5aca40cf305e), [`a2bfcaf`](https://github.com/sveltejs/kit/commit/a2bfcafbe496e23b1e0bcfce442309bb94783efd), [`680405d`](https://github.com/sveltejs/kit/commit/680405d2d06f02774a8d7df5351df4a0d259c338), [`3a7d329`](https://github.com/sveltejs/kit/commit/3a7d3290e28dffa730d0c71699906dbc6d2fd584)]:
  - @sveltejs/kit@3.0.0-next.28

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
