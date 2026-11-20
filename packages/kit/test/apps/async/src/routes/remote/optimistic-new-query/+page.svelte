<script>
	import { refreshAll } from '$app/navigation';
	import { foo, mutate } from './data.remote';

	let show = $state(false);
</script>

<button onclick={() => mutate().updates(foo().withOverride(() => 'bar'))}>override</button>
<button onclick={() => (show = true)}>show</button>
<button onclick={() => refreshAll()}>refresh all</button>

{#if show}
	<p>{await foo()}</p>
{/if}
