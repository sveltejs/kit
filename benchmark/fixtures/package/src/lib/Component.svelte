<script lang="ts">
	import { formatMetric, type BenchmarkTone } from '#lib';

	interface Props {
		label: string;
		value: number;
		tone?: BenchmarkTone;
		tags?: string[];
	}

	let { label, value, tone = 'neutral', tags = ['seed', 'component'] }: Props = $props();

	let expanded = $state(false);
	let metric = $derived(formatMetric(value));
	let badge = $derived(tone === 'positive' ? 'ready' : tone === 'caution' ? 'watch' : 'steady');
</script>

<article class:expanded data-tone={tone}>
	<header>
		<div>
			<h2>{label}</h2>
			<p>{metric}</p>
		</div>

		<span>{badge}</span>
	</header>

	<button type="button" onclick={() => (expanded = !expanded)}>
		{expanded ? 'Hide details' : 'Show details'}
	</button>

	{#if expanded}
		<ul>
			{#each tags as tag (tag)}
				<li>{tag}</li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	article {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #dbe4ff;
		border-radius: 0.75rem;
		background: #f8faff;
	}

	article.expanded {
		border-color: #7c3aed;
	}

	header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	h2,
	p,
	ul {
		margin: 0;
	}

	span {
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		background: #e2e8f0;
		font-size: 0.875rem;
		text-transform: capitalize;
	}

	article[data-tone='positive'] span {
		background: #dcfce7;
		color: #166534;
	}

	article[data-tone='caution'] span {
		background: #fef3c7;
		color: #92400e;
	}

	button {
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 0;
		border-radius: 0.5rem;
		background: #1d4ed8;
		color: white;
		font: inherit;
	}

	ul {
		padding-left: 1.25rem;
		color: #475569;
	}
</style>
