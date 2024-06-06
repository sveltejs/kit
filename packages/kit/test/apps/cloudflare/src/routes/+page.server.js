/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
	const test_namespace =
		/** @type {import('@cloudflare/workers-types').KVNamespace} */ platform?.env.TEST_NAMESPACE;
	await test_namespace?.put('foo', 'bar');
	const value = await test_namespace?.get('foo');
	return { value };
}
