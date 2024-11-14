<script>
	/** @type {string} */
	let status;

	function del() {
		fetch('delete-route/42.json', { method: 'DELETE' })
			.then((r) => r.json())
			.then(
				({ id }) => (status = `deleted ${id}`),
				(e) => (status = e.toString())
			);
	}
</script>

<button class="del" on:click={del}>delete</button>

{#if status}
	<h1>{status}</h1>
{/if}
