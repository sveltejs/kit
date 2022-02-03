<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/fetch-headers.json');

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

	const json = JSON.stringify({
		'sec-fetch-dest': headers['sec-fetch-dest'],
		'sec-fetch-mode': headers['sec-fetch-mode'],
		'if-none-match': headers['if-none-match'],
		referer: headers['referer']
	});
</script>

<pre>{json}</pre>
