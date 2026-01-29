import ComponentA from '$lib/ComponentA.svelte?client-import';
import ComponentB from '$lib/ComponentB.svelte?client-import';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const variant = url.searchParams.get('variant') || 'a';

	const componentPath = variant === 'b' ? ComponentB : ComponentA;

	return {
		componentPath,
		variant
	};
}
