<script lang="ts">
	import { get_count } from '../../query-command.remote.js';

	function get_message(error: unknown) {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error && 'message' in error) {
			return String(error.message);
		}

		return String(error);
	}
</script>

<svelte:boundary>
	<p>{get_count().run()}</p>

	{#snippet failed(error)}
		<p id="error">{get_message(error)}</p>
	{/snippet}
</svelte:boundary>
