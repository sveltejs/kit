<script>
	/** @type {import('./types').Block[]} */
	export let results;

	/** @type {string} */
	export let query;

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

{#if results.length > 0}
	<ul>
		{#each results as result, i}
			<li>
				<a href={result.href}>
					<small>{result.breadcrumbs.join('/')}</small>
					<strong>{@html excerpt(result.title, query)}</strong>
					<span>{@html excerpt(result.content, query)}</span>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="info">No results</p>
{/if}

<style>
	li {
		list-style: none;
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
</style>
