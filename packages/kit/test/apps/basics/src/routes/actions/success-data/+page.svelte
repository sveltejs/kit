<script>
	import { browser } from '$app/environment';

	/** @type {import('./$types').PageData} */
	export let data;

	async function submit() {
		const res = await fetch(this.action, {
			method: 'POST',
			body: new FormData(this),
			headers: {
				'accept': 'application/json'
			}
		});
		const { result } = await res.json();
		data.result = { ...data.result, ...result };
	}
	
	$: hydrated = browser ? data : {};
</script>

<pre class="server">{JSON.stringify(data)}</pre>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated}
	<pre class="client">{JSON.stringify(hydrated)}</pre>
{/if}

<form method="post" on:submit|preventDefault={submit}>
	<input name="username" type="text" />
	<button>Submit</button>
</form>
