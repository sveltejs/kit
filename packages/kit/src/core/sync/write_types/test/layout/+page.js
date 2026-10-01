/** @type {import('./.svelte-kit/types/$types').PageLoad} */
export function load({ data }) {
	data.pageServer;
	// @ts-expect-error
	data.pageShared;
	return {
		pageShared: 'pageShared'
	};
}

/** @type {import('./.svelte-kit/types/$types').PageData} */
const data = {
	shared: 'asd',
	pageShared: 'asd'
};
data.shared;
data.pageShared;
