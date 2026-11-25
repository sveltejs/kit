<script lang="ts">
	import { page } from '$app/state';
	import { get_count, get_batch_count } from './data.remote.js';
	import Awaited from './Awaited.svelte';

	const count = page.url.searchParams.has('batch') ? get_batch_count(1) : get_count();
	let refresh = $state('idle');
</script>

<button
	onclick={async () => {
		refresh = 'pending';
		try {
			await count.refresh();
			refresh = 'resolved';
		} catch {
			refresh = 'rejected';
		}
	}}>Refresh</button
>
<p id="refresh">{refresh}</p>
<p id="current">{count.current}</p>
<p id="error">{count.error?.message ?? 'none'}</p>
<p id="loading">{count.loading}</p>

<svelte:boundary>
	<p id="template-count">{await count}</p>
	{#snippet pending()}Loading{/snippet}
	{#snippet failed(error: any, reset: () => void)}
		<p id="template-failed">{error.message}</p>
		<button onclick={reset}>Reset template</button>
	{/snippet}
</svelte:boundary>

<svelte:boundary>
	<Awaited query={count} />
	{#snippet pending()}Loading{/snippet}
	{#snippet failed(error: any, reset: () => void)}
		<p id="script-failed">{error.message}</p>
		<button onclick={reset}>Reset script</button>
	{/snippet}
</svelte:boundary>
