## route_file_prefix_missing

> Missing route file prefix. Did you mean %corrected%? at %file%

SvelteKit only recognises [route files](https://svelte.dev/docs/kit/routing) whose names start with `+`, such as `+page.svelte`, `+layout.svelte`, `+page.js` and `+server.js`. This file matches a route filename except for the missing prefix, so it will be ignored. Rename it to the suggested name if it is intended to be a route file, or choose a different name to distinguish it from one.
