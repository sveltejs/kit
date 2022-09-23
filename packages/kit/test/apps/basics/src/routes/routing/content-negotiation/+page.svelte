<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;

	let result;

	/** @param {string} method */
	async function request(method) {
		result = 'loading';
		const response = await fetch('/routing/content-negotiation', { method });
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

<form method="POST" use:enhance>
	<button>Submit</button>
</form>

<p data-testid="form-result">form.submitted: {form?.submitted}</p>
