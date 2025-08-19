<script>
	import { get_todo } from './batch.remote.js';

	const todoIds = ['1', '2'];
</script>

<h1>Query Batch Test</h1>

<ul>
	{#each todoIds as id}
		<li>
			{#await get_todo(id)}
				<span>Loading todo {id}...</span>
			{:then todo}
				<span id="batch-result-{id}">{todo.title}</span>
			{:catch error}
				<span>Error loading todo {id}: {error.message}</span>
			{/await}
		</li>
	{/each}
</ul>

<button onclick={() => todoIds.forEach((id) => get_todo(id).refresh())}>refresh</button>
