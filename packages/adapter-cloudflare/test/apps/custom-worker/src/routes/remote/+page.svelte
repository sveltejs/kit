<script>
	import { get_marker, increment } from './data.remote.js';

	let count = $state(0);
</script>

{#await get_marker() then marker}
	<p id="marker">{marker}</p>
{/await}

<button onclick={async () => (count = await increment())}>{count}</button>
