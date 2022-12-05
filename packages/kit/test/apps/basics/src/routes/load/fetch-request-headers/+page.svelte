<script>
	/** @type {import('./$types').PageData} */
	export let data;

	const json = JSON.stringify({
		accept: data.headers['accept'],
		'accept-language': data.headers['accept-language'],
		connection: data.headers['connection'],
		'sec-fetch-dest': data.headers['sec-fetch-dest'],
		'sec-fetch-mode': data.headers['sec-fetch-mode'],
		'if-none-match': data.headers['if-none-match'],
		referer: data.headers['referer']
	});
</script>

<pre>{json}</pre>
