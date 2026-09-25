<script>
	import { foo, mutate } from './data.remote';

	let show = $state(false);
</script>

<button onclick={() => mutate().updates(foo().withOverride(() => 'bar'))}>override</button>
<button onclick={() => (show = true)}>show</button>

{#if show}
	<p>{await foo()}</p>
{/if}
