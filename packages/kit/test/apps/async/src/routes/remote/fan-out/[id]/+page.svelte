<script lang="ts">
	import { page } from '$app/state';
	import { get_item } from '../fan-out.remote.js';

	const item = $derived(get_item(page.params.id ?? ''));
</script>

<h1>Item Detail</h1>

<svelte:boundary>
	<p id="fan-out-detail-title">{(await item)?.title}</p>

	{#snippet failed(error)}
		<p id="fan-out-detail-title">Error: {(error as App.Error).message}</p>
	{/snippet}
</svelte:boundary>

<a href="/remote/fan-out" id="fan-out-back-link">back</a>
