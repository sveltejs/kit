<script>
	let result;

	/** @param {string} method */
	async function request(method) {
		result = 'loading';
		const response = await fetch('/routing/endpoint-next-to-page', {method});
		result = await response.text();
	}
</script>

<p>Hi</p>
<button on:click={() => request('GET')}>GET</button>
<button on:click={() => request('PUT')}>PUT</button>
<button on:click={() => request('PATCH')}>PATCH</button>
<button on:click={() => request('POST')}>POST</button>
<button on:click={() => request('DELETE')}>DELETE</button>
<pre>{result}</pre>
