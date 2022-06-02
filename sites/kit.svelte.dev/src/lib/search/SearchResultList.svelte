<script>
	import { createEventDispatcher } from 'svelte';

	/** @type {import('./types').Tree[]} */
	export let results;

	/** @type {string} */
	export let query;

	export let depth = 0;

	const dispatch = createEventDispatcher();

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
</script>

<ul style="--indent: {depth * 1}em;">
	{#each results as result, i}
		<li>
			<a href={result.href} on:click={() => dispatch('select', { href: result.href })}>
				<strong>{@html excerpt(result.breadcrumbs.at(-1), query)}</strong>

				{#if result.node?.content}
					<span>{@html excerpt(result.node.content, query)}</span>
				{/if}
			</a>

			{#if result.children.length > 0}
				<svelte:self results={result.children} {query} depth={depth + 1} on:select />
			{/if}
		</li>
	{/each}
</ul>

<style>
	ul {
		margin: 0;
	}

	li {
		list-style: none;
	}

	a {
		display: block;
		text-decoration: none;
		line-height: 1;
		padding: 1rem;
		padding-left: calc(1rem + var(--indent));
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
		line-height: 1;
	}

	a small {
		/* font-size: 1rem;
		text-transform: uppercase; */
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
		overflow: hidden;
		text-overflow: ellipsis;
	}

	a span :global(mark) {
		background: none;
		color: #111;
		background: rgba(255, 255, 0, 0.2);
		outline: 2px solid rgba(255, 255, 0, 0.2);
		border-top: 2px solid rgba(255, 255, 255, 0.2);
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
		color: black;
		background: rgba(255, 255, 0, 0.2);
		outline: 2px solid rgba(255, 255, 0, 0.2);
		border-top: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 1px;
	}
</style>
