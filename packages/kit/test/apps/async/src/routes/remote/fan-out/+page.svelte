<script lang="ts">
	import {
		get_item,
		get_items,
		set_item_title_server_refresh,
		reset_items,
		set_item_title,
		append_to_all_titles_requested
	} from './fan-out.remote.js';

	// Top-level so updates flow through correctly in non-async mode
	const pulls = get_items();
</script>

<h1>Query FanOut Test</h1>

<ul>
	{#await pulls then resources}
		{#each resources as resource, idx (idx)}
			<li>
				<svelte:boundary>
					<span id="fan-out-result-{idx + 1}">{(await resource)?.title}</span>

					{#snippet failed(error)}
						<span id="fan-out-result-{idx + 1}"
							>Error loading item: {(error as App.Error).message}</span
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
	id="fan-out-set-btn"
>
	set first item
</button>
<button
	onclick={async () => {
		await set_item_title_server_refresh({ id: '2', title: 'Walk the dog (refreshed)' });
	}}
	id="fan-out-refresh-btn"
>
	refresh second item via command
</button>
<button
	onclick={async () => {
		await reset_items();
	}}
	id="fan-out-reset-btn"
>
	reset items
</button>
<button
	onclick={async () => {
		await append_to_all_titles_requested(' (requested)').updates(get_item);
	}}
	id="fan-out-requested-refresh-all-btn"
>
	refresh all via requested
</button>

<a href="/remote/fan-out/1" id="fan-out-detail-link-1">go to item 1</a>
<a href="/remote/fan-out/2" id="fan-out-detail-link-2">go to item 2</a>
