<script>
	let message = '';

	export const snapshot = {
		capture: () => message,
		restore: (snapshot) => (message = snapshot)
	};
</script>

<input bind:value={message} />
