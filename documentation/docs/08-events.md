---
title: Events
---

SvelteKit emits a `sveltekit:start` [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) on the `window` object once the app has hydrated.

You probably won't need to use it, but it can be useful in the context of (for example) integration tests.
