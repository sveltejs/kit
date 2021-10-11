export const SVELTE_KIT = '.svelte-kit';

// can't put this in .svelte-kit/node_modules because esbuild
// doesn't have an equivalent of @rollup/plugin-node-resolve
export const SVELTE_KIT_MODULE = 'node_modules/@sveltejs/kit-server';

// in `svelte-kit dev` and `svelte-kit preview`, we use a fake
// asset path so that we can serve local assets while still
// verifying that requests are correctly prefixed
export const SVELTE_KIT_ASSETS = '/_svelte_kit_assets';
