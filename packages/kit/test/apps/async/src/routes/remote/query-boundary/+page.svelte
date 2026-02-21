<script>
	import { get_delayed_data, get_fast_data } from './data.remote.js';

	// shouldn't block SSR since requested immediately but awaited inside pending boundary
	const delayed = get_delayed_data();
</script>

<p id="fast-result">{await get_fast_data()}</p>
<svelte:boundary>
	{#snippet pending()}
		<p id="delayed-pending">loading delayed</p>
	{/snippet}
	<p id="delayed-result">{await delayed}</p>
</svelte:boundary>
