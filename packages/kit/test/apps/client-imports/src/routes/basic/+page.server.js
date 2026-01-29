import ComponentA from '$lib/ComponentA.svelte?client-import';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const componentPath = ComponentA;
	return {
		componentPath
	};
}
