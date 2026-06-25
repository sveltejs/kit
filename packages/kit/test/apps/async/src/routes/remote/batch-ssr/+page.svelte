<script lang="ts">
	import { get_todo } from './batch.remote.js';

	const todo_1 = get_todo('1');
	const todo_2 = get_todo('2');
	const todo_3 = get_todo('error');

	function get_message(error: unknown) {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error && 'message' in error) {
			return String(error.message);
		}

		return String(error);
	}
</script>

<p id="ssr-batch-result-1">{(await todo_1)?.title}</p>
<p id="ssr-batch-result-2">{(await todo_2)?.title}</p>

<svelte:boundary>
	<p id="ssr-batch-result-3">{(await todo_3)?.title}</p>

	{#snippet failed(error)}
		<p id="ssr-batch-result-3">{get_message(error)}</p>
	{/snippet}
</svelte:boundary>
