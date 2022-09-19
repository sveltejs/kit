<script>
	/** @param {boolean} expected */
	async function fail(expected) {
		await fetch(`/errors/error-html/make-root-fail?expected=${expected}`);
		location.reload();
	}
</script>

<button on:click={() => fail(false)}>Unexpected</button>
<button on:click={() => fail(true)}>Expected</button>
