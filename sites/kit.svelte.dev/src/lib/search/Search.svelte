<script>
	import { onMount } from 'svelte';
	import flexsearch from 'flexsearch';

	let searching = false;
	let ul;

	let query = '';
	let results = [];
	let selected = 0;

	let index;
	let lookup;

	onMount(async () => {
		const response = await fetch('/content.json');
		const { blocks } = await response.json();

		index = new flexsearch.Index({
			tokenize: 'forward'
		});

		lookup = new Map();

		for (const block of blocks) {
			lookup.set(block.href, block);
			index.add(block.href, block.content);
		}
	});

	function update(e) {
		query = e.target.value;
		results = (index ? index.search(query) : []).map((href) => lookup.get(href));
		selected = 0;
	}

	function escape(text) {
		return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function excerpt(content, query) {
		const index = content.toLowerCase().indexOf(query.toLowerCase());
		if (index === -1) {
			return content.slice(0, 100);
		}

		const prefix = index > 20 ? `...${content.slice(index - 15, index)}` : content.slice(0, index);
		const suffix = content.slice(
			index + query.length,
			index + query.length + (80 - (prefix.length + query.length))
		);

		return (
			escape(prefix) +
			`<mark>${escape(content.slice(index, index + query.length))}</mark>` +
			escape(suffix)
		);
	}

	function scroll_into_view() {
		const li = ul && ul.children[selected];
		if (li) {
			const ul_rect = ul.getBoundingClientRect();
			const li_rect = li.getBoundingClientRect();

			const d_top = ul_rect.top - li_rect.top;
			const d_bottom = ul_rect.bottom - li_rect.bottom;

			if (d_top > 0) ul.scrollTop -= d_top;
			if (d_bottom < 0) ul.scrollTop -= d_bottom;
		}
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.code === 'KeyK' && e.metaKey) {
			e.preventDefault();
			searching = !searching;
		}
	}}
/>

<div class="search-container">
	<input
		on:input={(e) => {
			searching = true;
			query = e.target.value;
			e.target.value = '';
		}}
		on:click={() => (searching = true)}
		type="search"
		placeholder="Search (Cmd-K)"
	/>
</div>

{#if searching}
	<div class="modal-background" on:click={() => (searching = false)}>
		<div class="search-box" on:click={(e) => e.stopPropagation()}>
			<!-- svelte-ignore a11y-autofocus -->
			<input
				autofocus
				on:keydown={(e) => {
					if (e.key === 'Tab' && results.length > 0) {
						console.log('preventing default');
						e.preventDefault();
					}

					if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
						selected += 1;
						selected %= results.length;
						scroll_into_view();
					}

					if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
						selected -= 1;
						if (selected === -1) selected = results.length - 1;
						scroll_into_view();
					}

					if (e.key === 'Escape') {
						searching = false;
					}

					if (e.key === 'Enter') {
						const a = ul.querySelector('[aria-current="true"] a');

						if (a) {
							a.click();
							searching = false;
						}
					}
				}}
				on:input={update}
			/>

			<ul bind:this={ul} class="results">
				{#each results as result, i}
					<!-- svelte-ignore a11y-mouse-events-have-key-events -->
					<li aria-current={i === selected} on:mouseover={() => (selected = i)}>
						<a href={result.href}>
							<strong>{result.breadcrumbs.join('/')}</strong>
							<span>{@html excerpt(result.content, query)}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.search-container {
		display: flex;
		align-items: center;
	}

	input {
		padding: 0.5em;
		border-radius: var(--border-r);
		border: 1px solid #ccc;
	}

	input[type='search'] {
		text-align: center;
		font-family: inherit;
		font-size: 1.6rem;
	}

	.search-container input {
		height: 2em;
	}

	.modal-background {
		position: fixed;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.search-box {
		width: calc(100vw - 2rem);
		height: calc(100vh - 2rem);
		max-width: 40rem;
		max-height: 60rem;
		padding: 2rem;
		background: white;
		filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.1));
		border-radius: var(--border-r);
		display: flex;
		flex-direction: column;
	}

	.search-box input {
		width: 100%;
		padding: 0.5rem;
		border-radius: var(--border-r);
		margin: 0 0 1rem 0;
	}

	.results {
		flex: 1;
		overflow: scroll;
	}

	ul {
	}

	li {
		list-style: none;
		margin: 0;
		padding: 1rem;
		border-radius: var(--border-r);
	}

	a {
		display: block;
		text-decoration: none;
	}

	a strong,
	a span {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	a strong {
		font-size: 1.6rem;
		margin: 0 0 0.2rem 0;
	}

	a span {
		font-size: 1.2rem;
	}

	[aria-current='true'] {
		background-color: var(--flash);
		color: white;
	}

	[aria-current='true'] * {
		color: white;
	}
</style>
