<script context="module">
	const valid_lists = new Set(['news', 'newest', 'show', 'ask', 'jobs']);

	export async function preload({ params }) {
		const list = (
			params.list === 'top' ? 'news' :
			params.list === 'new' ? 'newest' :
			params.list
		);

		if (!valid_lists.has(list)) {
			console.log('invalid');
			this.error(404, 'Not found');
			return;
		}

		const page = +params.page;

		const res = await this.fetch(`https://api.hnpwa.com/v0/${list}/${page}.json`);
		const items = await res.json();

		return {
			page,
			list,
			items
		};
	}
</script>

<script>
	import ItemSummary from './_ItemSummary.svelte';

	export let page;
	export let list;
	export let items;

	const PAGE_SIZE = 30;

	$: start = (1 + (page - 1) * PAGE_SIZE);
	$: next = `/${list}/${+page + 1}`;
</script>

<svelte:head>
	<title>Svelte Hacker News</title>
	<meta name="description" content="Latest Hacker News stories in the {list} category">
</svelte:head>

{#each items as item, i}
	{#if item} <!-- sometimes we get bad data? TODO investigate -->
		<ItemSummary {item} index={start + i}/>
	{/if}
{/each}

{#if next}
	<a class="more" href={next}>More...</a>
{/if}