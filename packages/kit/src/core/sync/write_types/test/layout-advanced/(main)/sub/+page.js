/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/layout-advanced/(main)/sub/$types').PageLoad} */
export async function load({ parent }) {
	const p = await parent();
	p.main;
	p.root;
	// @ts-expect-error
	p.sub;
	return {
		sub: 'sub'
	};
}

/** @type {import('../../.svelte-kit/types/src/core/sync/write_types/test/layout-advanced/(main)/sub/$types').PageData} */
const data = {
	main: '',
	root: '',
	sub: ''
};
data.main;
data.root;
data.sub;
