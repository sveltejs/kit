<script>
	let message = $state('');

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => message,
		restore: (value) => (message = value)
	};
</script>

<input bind:value={message} />
