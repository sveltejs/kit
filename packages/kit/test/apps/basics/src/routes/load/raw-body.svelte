<script context="module">
	/** @type {import('../../../../../../types').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/raw-body.json', {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: '{ "oddly" : { "formatted" : "json" } }'
		});

		return {
			props: await res.json()
		};
	}
</script>

<script>
	/** @type {any} */
	export let body;

	/** @type {string} */
	export let rawBody;
</script>

<pre class="parsed">{JSON.stringify(body)}</pre>
<pre class="raw">{rawBody}</pre>