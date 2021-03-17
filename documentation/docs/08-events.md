---
title: Events
---

SvelteKit emits [CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) on the `window` object when certain things happen:

* `sveltekit:start` — fired once at the start of the app's life
* `sveltekit:navigation-start` — navigation has started
* `sveltekit:navigation-end` — navigation has ended

You probably won't need to use these, but they can be useful in the context of (for example) integration tests.