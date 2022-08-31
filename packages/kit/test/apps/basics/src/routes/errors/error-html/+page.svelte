<script>
	async function fail() {
		await fetch('./error-html/make-root-fail');
		location.reload();
	}
</script>

<button on:click={fail}>Let's fail catastrophically</button>
