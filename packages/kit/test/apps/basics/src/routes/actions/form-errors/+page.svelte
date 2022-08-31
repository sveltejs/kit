<script>
	import { browser } from '$app/environment';
	import { form } from '$app/stores';

	const hydrated_error_message = browser ? 'hydrated: ' + $form?.errors?.message : '';
</script>

<form method="post">
	<button type="submit">Submit</button>
</form>

<p class="server">{$form?.errors?.message}</p>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_error_message}
	<p class="client">{hydrated_error_message}</p>
{/if}
