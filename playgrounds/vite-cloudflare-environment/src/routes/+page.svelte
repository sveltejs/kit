<script>
	export let data
</script>

<section>
	<h2>{data.userAgentText}</h2>
	<h2>KV example:</h2>
	{#if data.value}
		<p>Value: <strong>{data.value}</strong></p>
		<form method='POST' action='?/delete'>
			<button>Delete</button>
		</form>
	{:else}
		<form method='POST' action='?/create'>
			<label for="value">Set value: </label>
			<input type="text" name="value" id="value" required />
			<button>Save</button>
		</form>
	{/if}
</section>