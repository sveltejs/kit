<script>
	import Stale from '../Stale.svelte';

	let shown = $state(false);
</script>

<button data-testid="toggle" onclick={() => (shown = !shown)}>toggle</button>

{#if shown}
	<Stale />
{/if}

<a href="/snapshot/stale/a">a</a>
