<script context="module">
	/** @type {import('../../../../../../types').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/headers.json', {
			headers: {
				foo: 'bar'
			}
		});

		const { headers } = await res.json();

		return {
			props: { headers }
		}
	}
</script>

<script>
	/** @type {any} */
	export let headers;
</script>

<pre>{JSON.stringify({
	// custom header
	foo: headers.foo,

	// automatic header
	accept: headers.accept
})}</pre>