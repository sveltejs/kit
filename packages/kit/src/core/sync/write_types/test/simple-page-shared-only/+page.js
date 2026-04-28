export function load() {
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
data.bar;
