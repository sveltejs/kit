<script>
	let file = $state(/** @type {File | null} */ (null));

	/** @type {import('./$types').Snapshot<File | null>} */
	export const snapshot = {
		capture: () => {
			return file;
		},
		restore: (value) => {
			file = value;
		}
	};
</script>

<input
	type="file"
	data-testid="picker"
	oninput={(e) => (file = e.currentTarget.files?.[0] ?? null)}
/>

{#if file}
	<p data-testid="info">{file.name}|{file.size}</p>
{:else}
	<p data-testid="info">empty</p>
{/if}
