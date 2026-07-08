<script>
	import { get_value, update } from './data.remote';

	const { params } = $props();

	let show = $state(false);
</script>

<button id="update" onclick={() => update(params.key)}>update</button>
<button id="show" onclick={() => (show = true)}>show</button>

{#if show}
	<div id="value">{await get_value(params.key)}</div>
{/if}
