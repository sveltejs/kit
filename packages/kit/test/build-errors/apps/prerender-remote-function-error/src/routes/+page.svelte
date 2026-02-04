<script>
	import { throws } from './data.remote.js';
</script>

{#await throws() then value}
	{value}
{/await}
