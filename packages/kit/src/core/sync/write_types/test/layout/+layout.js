/** @type {import('./.svelte-kit/types/$types').LayoutLoad} */
export function load({ data }) {
	data.server;
	// @ts-expect-error
	data.shared;
	return {
		shared: 'shared'
	};
}
