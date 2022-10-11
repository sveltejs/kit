<script>
	let layout = false;
	let page_server_load = false;
	let layout_server_load = false;
	let page_shared_load = false;
	let layout_shared_load = false;
	let handle_hook = false;
</script>

<div>
	<h4>SvelteKit data flow</h4>
	<div>User navigates to page</div>

	<div class="server">
		{#if handle_hook}
			<div class="box">Populate locals, invoke handle hook's resolve function</div>
		{/if}

		{#if page_server_load || layout_server_load || page_shared_load || layout_shared_load}
			<div class="box">
				<div class="flex-center">
					{#if layout_server_load}
						<span
							>+layout.server.js load{#if handle_hook} (can access locals from handle){/if}</span
						>
					{/if}
					{#if page_server_load}
						<span
							>+page.server.js load{#if handle_hook} (can access locals from handle){/if}</span
						>
					{/if}
				</div>
				<div class="flex-center">
					{#if layout_shared_load}
						<span>+layout.js load</span>
					{/if}
					{#if page_shared_load}
						<span>+page.js load</span>
					{/if}
				</div>
				{#if [page_server_load, layout_server_load, page_shared_load, layout_shared_load].filter(Boolean).length > 1}
					<hr />
					<div class="flex-center">Wait for all data (loaded in parallel)</div>
				{/if}
			</div>
		{/if}

		{#if handle_hook}
			<div class="box">Return from resolve function and finish handle hook</div>
		{/if}
	</div>

	<div class="client">
		{#if page_shared_load || layout_shared_load}
			<div class="box flex-center">
				<span>
					replay {#if layout_shared_load}+layout.js{/if}
					{#if layout_shared_load && page_shared_load}and {/if}{#if page_shared_load}+page.js{/if} load
					using serialized fetch responses
				</span>
			</div>
		{/if}
		{#if layout}
			<div class="layout box">
				+layout.svelte content
				<div class="page box flex-center">+page.svelte content</div>
			</div>
		{:else}
			<div class="page box flex-center">+page.svelte content</div>
		{/if}
	</div>

	<div class="controls">
		<label>
			<input type="checkbox" bind:checked={layout} />
			+layout.svelte
		</label>

		<label>
			<input type="checkbox" bind:checked={page_server_load} />
			+page.server.js
		</label>
		<label>
			<input type="checkbox" bind:checked={layout_server_load} />
			+layout.server.js
		</label>

		<label>
			<input type="checkbox" bind:checked={page_shared_load} />
			+page.js
		</label>
		<label>
			<input type="checkbox" bind:checked={layout_shared_load} />
			+layout.js
		</label>

		<label>
			<input type="checkbox" bind:checked={handle_hook} />
			handle hook
		</label>
	</div>
</div>

<style>
	.server {
		border-left: 5px solid var(--second);
	}
	.client {
		border-left: 5px solid var(--prime);
	}
	.box {
		border: 1px solid var(--second);
		padding: 2rem 3rem;
		background-color: white;
	}
	.flex-center {
		display: flex;
		justify-content: center;
	}
	.flex-center span:not(:first-child) {
		margin-left: 5rem;
	}
	.layout {
		background-color: var(--back-light);
		position: relative;
		height: 15rem;
	}
	.layout .page {
		position: absolute;
		top: 6rem;
		left: 3rem;
		right: 3rem;
		bottom: 3rem;
		height: 6rem;
	}
	.controls {
		padding: 1rem 2rem;
	}
	label {
		display: inline-flex;
		align-items: center;
	}
	label:not(:first-child) {
		margin-left: 2rem;
	}
</style>
