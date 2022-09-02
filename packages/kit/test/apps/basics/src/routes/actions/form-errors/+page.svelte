<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	/** @type import('./$types').FormData */
	export let form;

	const hydrated_error_message1 = browser ? 'hydrated: ' + form?.errors?.message : '';
	const hydrated_error_message2 = browser ? 'hydrated: ' + $page.form?.errors?.message : '';
</script>

<form method="post">
	<button type="submit">Submit</button>
</form>

<p class="server-prop">{form?.errors?.message}</p>
<p class="server-store">{$page.form?.errors?.message}</p>

<!-- needs to be like this else the selector is found too soon (before hydration) -->
{#if hydrated_error_message1}
	<p class="client-prop">{hydrated_error_message1}</p>
	<p class="client-store">{hydrated_error_message2}</p>
{/if}
