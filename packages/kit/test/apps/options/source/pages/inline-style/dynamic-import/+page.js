export async function load() {
	return {
		Thing: (await import('./Thing.svelte')).default
	};
}
