<script lang="ts">
	import { page } from '$app/state';
	import { get_item } from '../query-in-query.remote.js';

	const item = $derived(get_item(page.params.id ?? ''));
</script>

<h1>Item Detail</h1>

<svelte:boundary>
	<p id="qiq-detail-title">{(await item)?.title}</p>

	{#snippet failed(error)}
		<p id="qiq-detail-title">Error: {(error as App.Error).message}</p>
	{/snippet}
</svelte:boundary>

<a href="/remote/query-in-query" id="qiq-back-link">back</a>
