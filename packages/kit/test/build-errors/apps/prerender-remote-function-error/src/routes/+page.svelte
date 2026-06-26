<script>
	import { throws } from './data.remote.ts';
</script>

{#await throws() then value}
	{value}
{/await}
