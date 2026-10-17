<script>
	import { page } from '$app/state';

	let open = $state(true);
	const preload = page.url.searchParams.get('preload') ?? 'data';
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<main>
	<a href="/data-sveltekit/preload-data/target" data-sveltekit-preload-data="hover">Navigate away</a
	>

	{#if open}
		<div
			role="dialog"
			aria-label="Removable dialog"
			data-sveltekit-preload-code={preload === 'code' ? 'hover' : 'false'}
			data-sveltekit-preload-data={preload === 'data' ? 'hover' : 'false'}
		>
			{#if page.url.searchParams.get('svg') === 'true'}
				<svg width="200" height="50">
					<a href="/data-sveltekit/preload-data/target"><text x="0" y="25">Link in dialog</text></a>
				</svg>
			{:else}
				<a href="/data-sveltekit/preload-data/target">Link in dialog</a>
			{/if}
		</div>
	{/if}
</main>
