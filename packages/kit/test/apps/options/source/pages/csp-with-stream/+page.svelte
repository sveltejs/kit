<script>
	export let data;
</script>

{#await data.lazy}
	Loading...
{:then value}
	<h2>{value}</h2>
{/await}
