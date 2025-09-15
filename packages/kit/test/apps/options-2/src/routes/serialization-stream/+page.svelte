<script>
	export let data;
</script>

<h1>
	{#await data.foo}
		Loading...
	{:then result}
		{result.bar()}
	{/await}
</h1>
