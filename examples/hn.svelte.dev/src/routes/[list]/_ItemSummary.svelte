<script>
	export let item;
	export let index;
</script>

<article>
	<h2>
		<a href={item.domain ? item.url : `/item/${item.id}`}>{item.title} {#if item.domain}<small>({item.domain})</small>{/if}</a>
	</h2>

	{#if item.type === 'job'}
		<p>{item.time_ago}</p>
	{:else}
		<p>
			{item.points} points by
			<a sveltekit:prefetch href="/user/{item.user}">{item.user}</a> {item.time_ago}
			 | <a sveltekit:prefetch href="/item/{item.id}">{item.comments_count} {item.comments_count === 1 ? 'comment' : 'comments'}</a>
		</p>
	{/if}

	<span class="index">{index}</span>
</article>

<style>
	article {
		position: relative;
		padding: 0 0 0 4em;
		margin: 0 0 1.5em 0;
	}

	h2 {
		font-size: 1em;
		font-weight: 500;
		margin: 0 0 0.5em 0;
		color: var(--fg);
	}

	h2 a {
		text-decoration: none;
	}

	p {
		font-size: 0.8em;
		color: var(--fg-light);
		margin: 0;
		font-weight: 300;
	}

	small {
		color: var(--fg-light);
		font-weight: 300;
	}

	.index {
		position: absolute;
		font-size: 1.6em;
		font-weight: 200;
		color: var(--fg-light);
		left: 0.2em;
		top: 0;
		text-align: right;
		width: 0.75em;
		line-height: 1;
	}
</style>