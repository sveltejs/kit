export function load() {
	return {
		shared: 'shared'
	};
}

/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/simple-page-shared-only/$types').PageData} */
const data = {
	shared: 'asd'
};
data.shared;
// @ts-expect-error
data.bar;
