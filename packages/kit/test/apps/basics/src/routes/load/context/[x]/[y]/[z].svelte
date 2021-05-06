<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, context }) {
		return {
			props: {
				...context,
				z: page.params.z
			}
		};
	}
</script>

<script>
	/** @type {string} */
	export let message;

	/** @type {string} */
	export let x;

	/** @type {string} */
	export let y;

	/** @type {string} */
	export let z;
</script>

<h1>message: {message}</h1>
<pre>{JSON.stringify({x, y, z})}</pre>
