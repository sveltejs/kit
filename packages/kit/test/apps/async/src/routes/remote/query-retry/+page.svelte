<script lang="ts">
	import { fork } from 'svelte';
	import { page } from '$app/state';
	import { get_greeting, get_greeting_batch } from './data.remote';

	// Keep the proxy alive so retry cannot depend on garbage collection.
	const query = page.url.searchParams.has('batch') ? get_greeting_batch : get_greeting;
	const greeting = query(page.url.searchParams.get('key') ?? 'default');
</script>

<svelte:boundary>
	<p>{await greeting}</p>
	{#snippet pending()}
		<p>Loading...</p>
	{/snippet}
	{#snippet failed(error: unknown, reset: () => void)}
		<p>Failed: {(error as App.Error).message}</p>
		<button onclick={reset}>Try again</button>
	{/snippet}
</svelte:boundary>

<button
	onclick={() => {
		const speculative = fork(() => {
			void greeting.then;
		});
		speculative.discard();
	}}>Discard speculative retry</button
>
