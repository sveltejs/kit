<script>
	import { get_todo } from './batch.remote.js';

	const todoIds = ['1', '2', '1', 'error'];
</script>

<h1>Query Batch Test</h1>

<ul>
	{#each todoIds as id, idx}
		<li>
			{#await get_todo(id)}
				<span id="batch-result-{idx + 1}">Loading todo {id}...</span>
			{:then todo}
				<span id="batch-result-{idx + 1}">{todo.title}</span>
			{:catch error}
				<span id="batch-result-{idx + 1}">Error loading todo {id}: {error.body.message}</span>
			{/await}
		</li>
	{/each}
</ul>

<button onclick={() => todoIds.forEach((id) => get_todo(id).refresh())}>refresh</button>
