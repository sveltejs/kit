<script>
	import { browser } from '$app/environment';

	export let errors

	const hydrated_error_message = browser ? 'hydrated: ' + errors?.message : '';
</script>

<form method="post">
	<button type="submit">Submit</button>
</form>

<p class="server">{errors?.message}</p>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_error_message}
	<p class="client">{hydrated_error_message}</p>
{/if}
