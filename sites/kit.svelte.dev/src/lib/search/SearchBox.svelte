<script>
	import { onMount } from 'svelte';
	import { Icon } from '@sveltejs/site-kit';
	import { afterNavigate } from '$app/navigation';
	import { searching, query, recent } from './stores.js';
	import { focusable_children, trap } from '../actions/focus.js';
	import SearchResults from './SearchResults.svelte';
	import SearchWorker from '$lib/workers/search.js?worker';

	let modal;

	let search = null;
	let recent_searches = [];

	let worker;
	let ready = false;

	let uid = 1;
	const pending = new Set();
	let has_pending = false;

	onMount(async () => {
		if (!(!import.meta.env.LEGACY && 'Worker' in window)) {
			console.warn("The search web worker can't be initialized in this platform, searching wouldn't work.");
			return;
		}

		worker = new SearchWorker();

		worker.addEventListener('message', (event) => {
			const { type, payload } = event.data;

			if (type === 'ready') {
				ready = true;
			}

			if (type === 'results') {
				search = payload;
			}

			if (type === 'recents') {
				recent_searches = payload;
			}
		});

		worker.postMessage({
			type: 'init',
			payload: {
				origin: location.origin
			}
		});
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
			document.body.tabIndex = -1;
			document.body.focus();
			document.body.removeAttribute('tabindex');
			window.scrollTo(0, scroll);
		}

		search = null;
	}

	/** @param {string} href */
	function navigate(href) {
		$recent = [href, ...$recent.filter((x) => x !== href)];
		close();
	}

	$: if (ready) {
		const id = uid++;
		pending.add(id);
		has_pending = true;

		worker.postMessage({ type: 'query', id, payload: $query });
	}

	$: if (ready) {
		worker.postMessage({ type: 'recents', payload: $recent });
	}

	$: if ($searching) {
		document.body.style.top = `-${window.scrollY}px`;
		document.body.style.position = 'fixed';
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (!(!import.meta.env.LEGACY && 'Worker' in window)) {
			return;
		}
		
		if (e.key === 'k' && (navigator.platform === 'MacIntel' ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			$query = '';

			if ($searching) {
				close();
			} else {
				$searching = true;
			}
		}

		if (e.code === 'Escape') {
			close();
		}
	}}
/>

{#if $searching && ready}
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
						modal.querySelector('a[data-has-node]')?.click();
					}
				}}
				on:input={(e) => {
					$query = e.target.value;
				}}
				value={$query}
				placeholder="Search"
				aria-describedby="search-description"
				spellcheck="false"
			/>

			<button aria-label="Close" on:click={close}>
				<Icon name="close" />
			</button>

			<span id="search-description" class="visually-hidden">Results will update as you type</span>

			<div class="results">
				{#if search?.query}
					<div class="results-container" on:click={() => ($searching = false)}>
						<SearchResults
							results={search.results}
							query={search.query}
							on:select={(e) => {
								navigate(e.detail.href);
							}}
						/>
					</div>
				{:else}
					<h2 class="info">{recent_searches.length ? 'Recent searches' : 'No recent searches'}</h2>
					{#if recent_searches.length}
						<div class="results-container">
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
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<div aria-live="assertive">
	{#if $searching && search?.results.length === 0}
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
		flex-shrink: 0;
	}

	input::selection {
		background-color: rgba(255, 255, 255, 0.4);
	}

	input:focus-visible {
		background: var(--second);
		color: white;
		outline: none;
	}

	input:focus-visible::placeholder {
		color: rgba(255, 255, 255, 0.5);
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
		justify-content: center;
		align-items: center;
		pointer-events: none;
	}

	.search-box {
		position: relative;
		height: calc(100% - 2rem);
		width: calc(100vw - 2rem);
		max-width: 50rem;
		max-height: 50rem;
		filter: drop-shadow(2px 4px 16px rgba(0, 0, 0, 0.2));
		border-radius: var(--border-r);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search-box > * {
		pointer-events: all;
	}

	.results {
		overflow: auto;
		overscroll-behavior-y: none;
	}

	.results-container {
		background: white;
		border-radius: 0 0 var(--border-r) var(--border-r);
		pointer-events: all;
	}

	.info {
		padding: 1rem;
		font-size: 1.2rem;
		font-weight: normal;
		text-transform: uppercase;
		background-color: white;
		border-radius: 0 0 var(--border-r) var(--border-r);
		pointer-events: all;
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
	a strong {
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

	a:focus small {
		color: rgba(255, 255, 255, 0.6);
	}

	a:focus strong {
		color: white;
	}

	a strong :global(mark) {
		background: var(--second);
		color: white;
		text-decoration: none;
		border-radius: 1px;
	}

	li {
		position: relative;
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
