<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<h1 id="top">Trailing route group</h1>

{#snippet links()}
	<a data-suffix="?a=1" href={resolve('/resolve-group/(app)?a=1')}>query</a>
	<a data-suffix="#top" href={resolve('/resolve-group/(app)#top')}>hash</a>
{/snippet}

<div id="server-links">
	{@render links()}
</div>

{#if mounted}
	<div id="client-links">
		{@render links()}
	</div>
{/if}
