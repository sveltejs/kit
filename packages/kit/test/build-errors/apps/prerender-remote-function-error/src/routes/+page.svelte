<script>
	import { from_inputs, throws } from './data.remote.ts';
</script>

{#await throws() then values}
	{#each values as value}
		{#await from_inputs(value) then result}
			{result}
		{/await}
	{/each}
{/await}
