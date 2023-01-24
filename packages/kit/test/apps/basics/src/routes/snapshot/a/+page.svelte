<script>
	let message = '';

	export const snapshot = {
		capture: () => message,
		apply: (snapshot) => (message = snapshot)
	};
</script>

<input bind:value={message} />
