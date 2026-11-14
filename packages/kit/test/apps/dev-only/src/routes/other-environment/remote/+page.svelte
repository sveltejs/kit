<script>
	import { environment, increment } from './data.remote.js';

	let count = $state(0);
</script>

{#await environment() then value}
	<p>{value}</p>
{/await}

<button onclick={async () => (count = await increment())}>{count}</button>
