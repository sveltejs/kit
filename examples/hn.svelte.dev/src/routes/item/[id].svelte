<script context="module">
	export async function load({ page, fetch }) {
		const res = await fetch(`https://api.hnpwa.com/v0/item/${page.params.id}.json`);
		const item = await res.json();

		return { props: { item } };
	}
</script>

<script>
	import Comment from './_Comment.svelte';

	export let item;
</script>

<svelte:head>
	<title>{item.title} | Svelte Hacker News</title>
</svelte:head>

<div>
	<article class="item">
		<a class="main-link" href={item.url}>
			<h1>{item.title}</h1>
			{#if item.domain}<small>{item.domain}</small>{/if}
		</a>

		<p class="meta">{item.points} points by <a href="/user/{item.user}">{item.user}</a> {item.time_ago}</p>

		{#if item.content}
			{@html item.content}
		{/if}
	</article>

	<div class="comments">
		{#each item.comments as comment}
			<Comment comment='{comment}'/>
		{/each}
	</div>
</div>

<style>
	h1 {
		font-weight: 500;
	}

	.item {
		border-bottom: 1em solid rgba(0,0,0,0.1);
		margin: 0 -2em 2em -2em;
		padding: 0 2em 2em 2em;
	}

	:global(html).dark .item {
		border-bottom: 1em solid rgba(255,255,255,0.1);;
	}

	.main-link {
		display: block;
		text-decoration: none;
	}

	small {
		display: block;
		font-size: 14px;
	}

	.meta {
		font-size: 0.8em;
		font-weight: 300;
		color: var(--fg-light);
	}

	.comments > :global(.comment):first-child {
		border-top: none;
	}
</style>