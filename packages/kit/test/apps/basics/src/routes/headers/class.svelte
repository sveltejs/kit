<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/headers/echo', {
			headers: new Headers({ foo: 'bar' })
		});

		return {
			props: {
				headers: await res.json()
			}
		};
	}
</script>

<script>
	/** @type {Record<string, string>} */
	export let headers;
</script>

<pre>{JSON.stringify(headers)}</pre>
