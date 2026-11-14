export async function load({ url }) {
	if (!url.searchParams.has('lazy')) return {};

	const { default: Lazy } = await import('./Lazy.svelte');
	return { Lazy };
}
