<script>
	import { getData } from './example.remote';
</script>

{#await getData() then data}
	<p>a: {data.a}</p>
{/await}
