<script>
	import { onMount } from 'svelte';

	export let error;
	onMount(async () => {
		const response = await fetch('/errors/endpoint-throws/fetch-throws', {
			method: 'post',
			headers: { Accept: 'application/json' }
		});
		const out = await response.json();
		error = out.message;
	});
</script>

<div id="error">
	{error}
</div>
