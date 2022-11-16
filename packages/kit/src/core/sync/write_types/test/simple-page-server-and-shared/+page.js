/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/simple-page-server-and-shared/$types').PageLoad} */
export function load({ data }) {
	data.server;
	// @ts-expect-error
	data.shared;
	return {
		shared: 'shared'
	};
}

/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/simple-page-server-and-shared/$types').PageData} */
const data = {
	shared: 'asd'
};
data.shared;
// @ts-expect-error
data.server;
