<script>
	import { onMount } from 'svelte';
	import flexsearch from 'flexsearch';
	import { goto } from '$app/navigation';
	import { searching, query } from './stores.js';

	let ul;
	let modal;

	let results = [];
	let selected = 0;
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

	function update() {
		results = (index ? index.search($query) : []).map((href) => lookup.get(href));
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

	$: if ($searching) update();
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.code === 'KeyK' && (navigator.platform === 'MacIntel' ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			$searching = !$searching;
		}
	}}
	on:focusin={() => {
		if (modal && !modal.contains(document.activeElement)) {
			$searching = false;
		}
	}}
/>

{#if $searching}
	<div
		bind:this={modal}
		class="modal-background"
		on:click={() => ($searching = false)}
		on:wheel={(e) => e.preventDefault()}
		on:touchmove={(e) => e.preventDefault()}
	>
		<div
			class="search-box"
			on:click={(e) => e.stopPropagation()}
			on:wheel={(e) => e.stopPropagation()}
			on:touchmove={(e) => e.stopPropagation()}
		>
			<!-- svelte-ignore a11y-autofocus -->
			<input
				autofocus
				on:keydown={(e) => {
					if (e.key === 'Tab' && results.length > 0) {
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
						$searching = false;
					}

					if (e.key === 'Enter') {
						$searching = false;
						goto(results[selected].href);
					}

					// ideally, opening the modal would create a history entry that we
					// could use with browser back/forward buttons — this would be the
					// best way to allow people to close the modal on mobile, for
					// example. That's a little tricky to do right now — need to add
					// new APIs to SvelteKit — but in the meantime we can close the
					// modal when the backspace key is pressed. we _don't_ want that
					// to happen when the backspace keydown fires repeatedly, so we
					// track whether it was already pressed or not. (Sadly this
					// doesn't work on mobile, longpress will close the modal)
					if (e.key === 'Backspace') {
						if ($query === '' && !backspace_pressed) {
							$searching = false;
						}

						backspace_pressed = true;
					}
				}}
				on:keyup={(e) => {
					if (e.key === 'Backspace') {
						backspace_pressed = false;
					}
				}}
				on:input={(e) => {
					$query = e.target.value;
					update();
				}}
				value={$query}
				placeholder="Search"
			/>

			<ul bind:this={ul} class="results">
				{#each results as result, i}
					<!-- svelte-ignore a11y-mouse-events-have-key-events -->
					<li aria-current={i === selected} on:mouseover={() => (selected = i)}>
						<a href={result.href}>
							<small>{result.breadcrumbs.join('/')}</small>
							<strong>{@html excerpt(result.title, $query)}</strong>
							<span>{@html excerpt(result.content, $query)}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	input {
		font-family: inherit;
		font-size: 1.6rem;
		width: 100%;
		padding: 1rem 1rem 0.5rem 1rem;
		height: 5rem;
		border: none;
		border-bottom: 1px solid #eee;
		font-weight: 600;
	}

	input::selection {
		background-color: rgba(255, 255, 255, 0.4);
	}

	input:focus-visible {
		background: var(--flash);
		color: white;
		outline: none;
	}

	.modal-background {
		position: fixed;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.search-box {
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
	}

	.results {
		flex: 1;
		overflow: auto;
	}

	ul {
		margin: 0;
	}

	li {
		list-style: none;
		margin: 0;
		padding: 1rem;
	}

	a {
		display: block;
		text-decoration: none;
		line-height: 1;
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
		color: var(--text);
	}

	a strong :global(mark) {
		background: var(--flash);
		color: white;
		text-decoration: none;
		border-radius: 1px;
	}

	[aria-current='true'] {
		background: #eee;
	}
</style>
