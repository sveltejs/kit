const key = '__sveltekit_module_loaded';
// @ts-ignore
if (globalThis[key]) {
	console.warn(
		'SvelteKit has been loaded twice. This is likely a misconfiguration, and could cause subtle bugs. For more information, visit TODO'
	);
}
// @ts-ignore
globalThis[key] = true;
