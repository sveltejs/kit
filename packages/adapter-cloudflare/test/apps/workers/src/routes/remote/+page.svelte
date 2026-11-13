<script>
	import { increment, runtime } from './data.remote.js';

	let count = $state(0);
</script>

{#await runtime() then value}
	<p id="runtime">{value}</p>
{/await}

<button onclick={async () => (count = await increment())}>{count}</button>
