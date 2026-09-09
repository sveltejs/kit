<script>
	let { data } = $props();

	let featured = $derived.by(() => data.items.filter((item) => item.stats.featured).length);
</script>

<section>
	<h2>Data-heavy SSR route</h2>
	<p>
		Hook cohort:
		<code>{data.request.cohort}</code>
		· cookie:
		<code>{data.request.cookie}</code>
	</p>
	<p>
		Items: {data.summary.total}
		· featured: {featured}
		· last:
		<code>{data.summary.last}</code>
	</p>

	<ol>
		{#each data.items as item (item.id)}
			<li>
				<strong>{item.slug}</strong>
				<span>{item.group}</span>
				<span>{item.stats.rank}/{item.stats.score}</span>
			</li>
		{/each}
	</ol>
</section>

<style>
	section {
		padding: 1.5rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
	}

	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		gap: 0.25rem;
		padding: 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
	}

	code,
	strong {
		font-family: ui-monospace, monospace;
	}
</style>
