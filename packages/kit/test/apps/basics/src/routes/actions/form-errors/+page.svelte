<script>
	import { browser } from '$app/environment';

	/** @type {import('./$types').ActionData} */
	export let form;

	const hydrated_error_message = browser ? 'hydrated: ' + form?.errors?.message : '';
</script>

<form method="post">
	<button type="submit">Submit</button>
</form>

<p class="server-prop">{form?.errors?.message}</p>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_error_message}
	<p class="client-prop">{hydrated_error_message}</p>
{/if}
