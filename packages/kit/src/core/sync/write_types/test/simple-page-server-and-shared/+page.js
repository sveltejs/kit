/** @type {import('./.svelte-kit/types/$types').PageLoad} */
export function load({ data }) {
	data.server;
	// @ts-expect-error
	data.shared;
	return {
		shared: 'shared'
	};
}

/** @type {import('./.svelte-kit/types/$types').PageData} */
const data = {
	shared: 'asd'
};
data.shared;
// @ts-expect-error
data.server;
