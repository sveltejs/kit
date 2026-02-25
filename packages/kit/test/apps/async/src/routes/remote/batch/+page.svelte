<script lang="ts">
	import {
		get_todo,
		set_todo_title_server_refresh,
		reset_todos,
		set_todo_title
	} from './batch.remote.js';

	const todoIds = ['1', '2', '1', 'error'];
	// Need to write this outside at the top level to ensure tests succeed in non-async-mode
	// Else updates are not coming through properly because of state-created-inside-effects-not-updating logic in non-async mode
	const todos = todoIds.map((id) => ({ id, promise: get_todo(id) }));
</script>

<h1>Query Batch Test</h1>

<ul>
	{#each todos as { id, promise }, idx (idx)}
		<li>
			<svelte:boundary>
				<span id="batch-result-{idx + 1}">{(await promise).title}</span>

				{#snippet pending()}
					<span id="batch-result-{idx + 1}">Loading todo {id}...</span>
				{/snippet}

				{#snippet failed(error)}
					<span id="batch-result-{idx + 1}"
						>Error loading todo {id}: {(error as any).body.message}</span
					>
				{/snippet}
			</svelte:boundary>
		</li>
	{/each}
</ul>

<button onclick={() => todoIds.forEach((id) => get_todo(id).refresh())}>refresh</button>
<button
	onclick={async () => {
		await set_todo_title({ id: '1', title: 'Buy cat food' });
	}}
	id="batch-set-btn"
>
	set first todo
</button>
<button
	onclick={async () => {
		await set_todo_title_server_refresh({ id: '2', title: 'Walk the dog (refreshed)' });
	}}
	id="batch-refresh-btn"
>
	refresh second todo via command
</button>
<button
	onclick={async () => {
		await reset_todos();
	}}
	id="batch-reset-btn"
>
	reset todos
</button>
