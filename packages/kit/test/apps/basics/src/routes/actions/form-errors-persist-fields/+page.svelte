<script>
	import { deserialize } from '$app/forms';
	import { browser } from '$app/environment';

	/** @type {import('./$types').ActionData} */
	export let form;

	$: hydrated_form_values = browser ? form?.values : '';

	async function submit() {
		const res = await fetch(this.action, {
			method: 'POST',
			body: new FormData(this),
			headers: {
				accept: 'application/json'
			}
		});
		// @ts-expect-error don't bother with type narrowing work here
		const { data } = deserialize(await res.text());
		form = data;
	}
</script>

<form method="post" on:submit|preventDefault={submit}>
	<input type="text" name="username" value={form?.values?.username ?? ''} />
	<input type="password" name="password" />
	<button type="submit">Submit</button>
</form>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_form_values}
	<pre class="client">{JSON.stringify(hydrated_form_values)}</pre>
{/if}
