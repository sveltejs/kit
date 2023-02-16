<script>
	let message = '';

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => message,
		restore: (snapshot) => (message = snapshot)
	};
</script>

<input bind:value={message} />
