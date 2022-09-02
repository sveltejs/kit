<script>
	import { browser } from '$app/environment';
	import { submitted } from '$app/stores';

	$: hydrated_form_values = browser ? $submitted?.values : '';

	async function submit() {
		const res = await fetch(this.action, {
			method: 'POST',
			body: new FormData(this),
			headers: {
				'accept': 'application/json'
			}
		});
		const { data: { errors, values } } = await res.json();
		$submitted = { errors, values };
	}
</script>

<form method="post" on:submit|preventDefault={submit}>
	<input type="text" name="username" value={$submitted?.values?.username ?? ''} />
	<input type="password" name="password" />
	<button type="submit">Submit</button>
</form>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_form_values}
	<pre class="client">{JSON.stringify(hydrated_form_values)}</pre>
{/if}
