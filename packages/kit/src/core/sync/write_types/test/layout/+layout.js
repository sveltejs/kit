/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/layout/$types').LayoutLoad} */
export function load({ data }) {
	data.server;
	// @ts-expect-error
	data.shared;
	return {
		shared: 'shared'
	};
}
