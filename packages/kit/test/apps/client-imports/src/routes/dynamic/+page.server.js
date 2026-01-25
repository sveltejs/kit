/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const componentName = url.searchParams.get('component') || 'ComponentA';
	const componentModule = await import(`$lib/${componentName}.svelte?client-import`);

	return {
		componentPath: componentModule?.default,
		componentName
	};
}
