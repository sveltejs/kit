export async function load() {
	return {
		Thing: (await import('./_/Thing.svelte')).default
	};
}
