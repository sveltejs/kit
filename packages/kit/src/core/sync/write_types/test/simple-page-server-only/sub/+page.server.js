/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/simple-page-server-only/sub/$types').PageServerLoad} */
export function load() {
	if (Math.random() > 0.5) {
		return {
			foo: 'bar'
		};
	}
}

/** @type {import('../.svelte-kit/types/src/core/sync/write_types/test/simple-page-server-only/sub/$types').PageData} */
const data = /** @type {any} */ ({
	foo: 'bar'
}); // the any cast prevents TypeScript from narrowing this to foo being defined
data.foo;
// @ts-expect-error
data.foo.charAt(0);
