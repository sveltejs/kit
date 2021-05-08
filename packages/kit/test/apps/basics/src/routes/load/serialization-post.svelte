<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		/** @param {string} body */
		async function post(body) {
			const res = await fetch('/load/serialization-post.json', {
				method: 'POST',
				headers: {
					'content-type': 'text/plain'
				},
				body
			});

			return await res.text();
		}
		const a = await post('x');
		const b = await post('y');

		return {
			props: { a, b }
		};
	}
</script>

<script>
	/** @type {string} */
	export let a;

	/** @type {string} */
	export let b;
</script>

<h1>a: {a}</h1>
<h2>b: {b}</h2>
