<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const url = '/fetch-endpoint/not-buffered.json';
		const res = await fetch(url);

		return {
			props: {
				headers: res.headers
			}
		};
	}
</script>

<script>
	/** @type {Headers} */
	export let headers;
</script>

<h1>content-type: {headers.get('content-type')}</h1>
