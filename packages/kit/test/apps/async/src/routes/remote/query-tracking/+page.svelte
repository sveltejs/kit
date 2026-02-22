<script>
	import { get_count, increment } from './query.remote.js';

	let instance = $state();
	let instantiated = $state(false);
	let show = $state(false);

	async function instantiate() {
		instance = get_count();
		await instance;
		instantiated = true;
	}
</script>

<button id="instantiate" onclick={instantiate}>instantiate</button>
<button id="show" onclick={() => (show = true)}>show</button>
<button id="increment" onclick={() => increment()}>increment</button>

<p id="instantiated">{instantiated ? 'instantiated' : 'idle'}</p>

{#if show}
	<p id="value">{instance?.current}</p>
{/if}
