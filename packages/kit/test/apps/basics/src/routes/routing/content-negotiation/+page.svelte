<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {string} */
	let result;

	/** @param {string} method */
	async function request(method) {
		result = 'loading';
		const response = await fetch('/routing/content-negotiation', { method });
		result = await response.text();
	}
</script>

<p>Hi</p>
<button onclick={() => request('GET')}>GET</button>
<button onclick={() => request('PUT')}>PUT</button>
<button onclick={() => request('PATCH')}>PATCH</button>
<button onclick={() => request('POST')}>POST</button>
<button onclick={() => request('DELETE')}>DELETE</button>
<pre>{result}</pre>

<form method="POST" use:enhance>
	<button>Submit</button>
</form>

<p data-testid="form-result">form.submitted: {form?.submitted}</p>
