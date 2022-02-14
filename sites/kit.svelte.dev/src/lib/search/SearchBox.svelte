<script>
	import { onMount } from 'svelte';
	import { Icon } from '@sveltejs/site-kit';
	import flexsearch from 'flexsearch';
	import { afterNavigate } from '$app/navigation';
	import { searching, query, recent } from './stores.js';
	import { focusable_children, trap } from '../actions/focus.js';

	let modal;

	let results = [];
	let backspace_pressed;

	let index;
	let lookup;

	onMount(async () => {
		const response = await fetch('/content.json');
		const { blocks } = await response.json();

		index = new flexsearch.Index({
			tokenize: 'forward'
		});

		lookup = new Map();

		let time = Date.now();
		for (const block of blocks) {
			const title = block.breadcrumbs[block.breadcrumbs.length - 1];
			lookup.set(block.href, {
				title,
				href: block.href,
				breadcrumbs: block.breadcrumbs.slice(0, -1),
				content: block.content
			});
			index.add(block.href, `${title} ${block.content}`);

			// poor man's way of preventing blocking
			if (Date.now() - time > 25) {
				await new Promise((f) => setTimeout(f, 0));
				time = Date.now();
			}
		}

		update();
	});

	afterNavigate(() => {
		// TODO this also needs to apply when only the hash changes
		// (should before/afterNavigate fire at that time? unclear)
		close();
	});

	function close() {
		if ($searching) {
			$searching = false;
			const scroll = -parseInt(document.body.style.top || '0');
			document.body.style.position = '';
			document.body.style.top = '';
			document.body.focus();
			window.scrollTo(0, scroll);
		}
	}

	function update() {
		results = (index ? index.search($query) : []).map((href) => lookup.get(href));
	}

	function escape(text) {
		return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function excerpt(content, query) {
		const index = content.toLowerCase().indexOf(query.toLowerCase());
		if (index === -1) {
			return content.slice(0, 100);
		}

		const prefix = index > 20 ? `…${content.slice(index - 15, index)}` : content.slice(0, index);
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

	/** @param {string} href */
	function navigate(href) {
		$recent = [href, ...$recent.filter((x) => x !== href)];
		close();
	}

	$: if ($searching) {
		update();
		document.body.style.top = `-${window.scrollY}px`;
		document.body.style.position = 'fixed';
	}

	$: recent_searches = lookup ? $recent.map((href) => lookup.get(href)).filter(Boolean) : [];
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'k' && (navigator.platform === 'MacIntel' ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			$query = '';
			$searching = !$searching;
		}

		if (e.code === 'Escape') {
			close();
		}
	}}
/>

{#if $searching && index}
	<div class="modal-background" on:click={close} />

	<div
		bind:this={modal}
		class="modal"
		on:keydown={(e) => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				const group = focusable_children(e.currentTarget);

				// when using arrow keys (as opposed to tab), don't focus buttons
				const selector = 'a, input';

				if (e.key === 'ArrowDown') {
					group.next(selector);
				} else {
					group.prev(selector);
				}
			}
		}}
		use:trap
	>
		<div class="search-box">
			<!-- svelte-ignore a11y-autofocus -->
			<input
				autofocus
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						if (results.length > 0) {
							modal.querySelector('a').click();
						}
					}
				}}
				on:input={(e) => {
					$query = e.target.value;
					update();
				}}
				value={$query}
				placeholder="Search"
				aria-describedby="search-description"
			/>

			<button aria-label="Close" on:click={close}>
				<Icon name="close" />
			</button>

			<span id="search-description" class="visually-hidden">Results will update as you type</span>

			<div class="results">
				{#if $query}
					{#if results.length > 0}
						<ul class="results">
							{#each results as result, i}
								<!-- svelte-ignore a11y-mouse-events-have-key-events -->
								<li>
									<a on:click={() => navigate(result.href)} href={result.href}>
										<small>{result.breadcrumbs.join('/')}</small>
										<strong>{@html excerpt(result.title, $query)}</strong>
										<span>{@html excerpt(result.content, $query)}</span>
									</a>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="info">No results</p>
					{/if}
				{:else}
					<h2 class="info">{recent_searches.length ? 'Recent searches' : 'No recent searches'}</h2>
					<ul>
						{#each recent_searches as search, i}
							<!-- svelte-ignore a11y-mouse-events-have-key-events -->
							<li class="recent">
								<a on:click={() => navigate(search.href)} href={search.href}>
									<small>{search.breadcrumbs.join('/')}</small>
									<strong>{search.title}</strong>
								</a>

								<button
									aria-label="Delete"
									on:click={(e) => {
										$recent = $recent.filter((href) => href !== search.href);
										e.stopPropagation();
										e.preventDefault();
									}}
								>
									<Icon name="delete" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{/if}

<div aria-live="assertive">
	{#if $searching && $query && results.length === 0}
		<p>No results</p>
	{/if}
</div>

<style>
	input {
		font-family: inherit;
		font-size: 1.6rem;
		width: 100%;
		padding: 1rem 6rem 0.5rem 1rem;
		height: 5rem;
		border: none;
		border-bottom: 1px solid #eee;
		font-weight: 600;
	}

	input::selection {
		background-color: rgba(255, 255, 255, 0.4);
	}

	input:focus-visible {
		background: var(--second);
		color: white;
		outline: none;
	}

	button[aria-label='Close'] {
		--size: 2rem;
		position: absolute;
		top: 0;
		right: 0;
		width: 5rem;
		height: 5rem;
		background: none;
		color: var(--text);
	}

	button[aria-label='Close']:focus-visible {
		background: var(--second);
		color: white;
		outline: none;
	}

	input:focus-visible + button[aria-label='Close'] {
		color: white;
	}

	.modal-background,
	.modal {
		position: fixed;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		z-index: 9999;
	}

	.modal-background {
		background: rgba(255, 255, 255, 0.7);
	}

	.modal {
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.search-box {
		position: relative;
		width: calc(100vw - 2rem);
		height: calc(100% - 2rem);
		max-width: 50rem;
		max-height: 50rem;
		background: white;
		filter: drop-shadow(2px 4px 16px rgba(0, 0, 0, 0.2));
		border-radius: var(--border-r);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		pointer-events: all;
	}

	.results {
		flex: 1;
		overflow: auto;
	}

	ul {
		margin: 0;
	}

	li {
		position: relative;
		list-style: none;
		margin: 0;
	}

	.info {
		padding: 1rem 1rem 0 1rem;
		font-size: 1.2rem;
		font-weight: normal;
		text-transform: uppercase;
	}

	a {
		display: block;
		text-decoration: none;
		line-height: 1;
		padding: 1rem;
	}

	a:hover {
		background: #eee;
	}

	a:focus {
		background: var(--second);
		color: white;
		outline: none;
	}

	a small,
	a strong,
	a span {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1;
	}

	a small {
		font-size: 1rem;
		text-transform: uppercase;
		font-weight: 600;
		color: #999;
	}

	a strong {
		font-size: 1.6rem;
		color: var(--text);
		margin: 0.4rem 0;
	}

	a span {
		font-size: 1.2rem;
		color: #999;
	}

	a span :global(mark) {
		background: none;
		color: #111;
	}

	a:focus small,
	a:focus span {
		color: rgba(255, 255, 255, 0.6);
	}

	a:focus strong {
		color: white;
	}

	a:focus span :global(mark) {
		color: white;
	}

	a strong :global(mark) {
		background: var(--second);
		color: white;
		text-decoration: none;
		border-radius: 1px;
	}

	button[aria-label='Delete'] {
		position: absolute;
		top: 0;
		right: 0;
		width: 5rem;
		height: 100%;
		color: var(--text);
		opacity: 0.1;
	}

	a:focus + [aria-label='Delete'] {
		color: white;
	}

	button[aria-label='Delete']:hover {
		opacity: 1;
		outline: none;
	}

	button[aria-label='Delete']:focus-visible {
		background: var(--second);
		color: white;
		opacity: 1;
		outline: none;
	}
</style>
