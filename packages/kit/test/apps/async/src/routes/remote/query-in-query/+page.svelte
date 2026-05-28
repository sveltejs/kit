<script lang="ts">
	import {
		get_item,
		get_items,
		set_item_title,
		set_item_title_server_refresh,
		reset_items,
		append_to_all_titles_requested
	} from './query-in-query.remote.js';

	// Top-level so updates flow through correctly in non-async mode
	const pulls = get_items();
</script>

<h1>Query In Query Test</h1>

<ul>
	{#await pulls then page}
		<li id="qiq-total">total: {page.total}</li>
		{#each page.rows as row, idx (row.key)}
			<li>
				<svelte:boundary>
					<span id="qiq-result-{idx + 1}">{(await row.query)?.title}</span>

					{#snippet failed(error)}
						<span id="qiq-result-{idx + 1}">Error loading item: {(error as App.Error).message}</span
						>
					{/snippet}
				</svelte:boundary>
			</li>
		{/each}
	{/await}
</ul>

<button
	onclick={async () => {
		await set_item_title({ id: '1', title: 'Buy cat food' });
	}}
	id="qiq-set-btn"
>
	set first item
</button>
<button
	onclick={async () => {
		await set_item_title_server_refresh({ id: '2', title: 'Walk the dog (refreshed)' });
	}}
	id="qiq-refresh-btn"
>
	refresh second item via command
</button>
<button
	onclick={async () => {
		await reset_items();
	}}
	id="qiq-reset-btn"
>
	reset items
</button>
<button
	onclick={async () => {
		await append_to_all_titles_requested(' (requested)').updates(get_item);
	}}
	id="qiq-requested-refresh-all-btn"
>
	refresh all via requested
</button>

<a href="/remote/query-in-query/1" id="qiq-detail-link-1">go to item 1</a>
<a href="/remote/query-in-query/2" id="qiq-detail-link-2">go to item 2</a>
