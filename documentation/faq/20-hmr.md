---
title: How do I use HMR with SvelteKit?
---

SvelteKit has HMR enabled by default powered by [svelte-hmr](https://github.com/sveltejs/svelte-hmr). If you saw [Rich's presentation at the 2020 Svelte Summit](https://svelte.dev/blog/whats-the-deal-with-sveltekit), you may have seen a more powerful-looking version of HMR presented. This demo had `svelte-hmr`'s `preserveLocalState` flag on. This flag is now off by default because it may lead to unexpected behaviour and edge cases. But don't worry, you are still getting HMR with SvelteKit! If you'd like to preserve local state you can use the `@hmr:keep` or `@hmr:keep-all` directives as documented on the [svelte-hmr](https://github.com/sveltejs/svelte-hmr) page.
