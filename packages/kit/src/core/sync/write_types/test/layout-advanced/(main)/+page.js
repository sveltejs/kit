// test to see if layout adjusts correctly if +page.js exists, but no load function

/** @type {import('../.svelte-kit/types/(main)/$types').PageData} */
const data = {
	root: ''
};
data.root;
// @ts-expect-error
data.main;
