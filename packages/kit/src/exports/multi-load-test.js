const key = '__sveltekit_module_loaded';
// @ts-ignore
if (globalThis[key]) {
	console.warn(
		'SvelteKit has been loaded twice. This is likely a misconfiguration, and could cause subtle bugs. For more information, visit https://svelte.dev/docs/kit/faq#Why-is-SvelteKit-being-loaded-twice'
	);
}
// @ts-ignore
globalThis[key] = true;
