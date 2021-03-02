<script>
	export let comment;

	let hidden = false;
</script>

{#if !comment.deleted}
	<article class="comment" class:hidden>
		<div class="meta-bar" on:click="{() => hidden = !hidden}">
			<span class="meta"><a sveltekit:prefetch href="/user/{comment.user}">{comment.user}</a> {comment.time_ago}</span>
		</div>

		<div class="body">
			{@html comment.content}
		</div>

		{#if comment.comments.length > 0}
			<ul class="children">
				{#each comment.comments as child}
					<li><svelte:self comment='{child}'/></li>
				{/each}
			</ul>
		{/if}
	</article>
{/if}

<style>
	.comment {
		border-top: 1px solid rgba(0,0,0,0.1);
	}

	:global(html).dark .comment {
		border-top: 1px solid rgba(255,255,255,0.1);;
	}

	.meta-bar {
		padding: 1em 0;
		cursor: pointer;
		background: 100% 50% no-repeat url(./_icons/fold.svg);
		background-size: 1em 1em;
	}

	.hidden .meta-bar {
		background-image: url(./_icons/unfold.svg);
	}

	.comment .children {
		padding: 0 0 0 1em;
		margin: 0;
	}

	.hidden .body, .hidden .children {
		display: none;
	}

	@media (min-width: 720px) {
		.comment .children {
			padding: 0 0 0 2em;
		}
	}

	li {
		list-style: none;
	}

	.meta {
		display: block;
		font-size: 14px;
		color: var(--fg-light);
	}

	a {
		color: var(--fg-light);
	}

	/* prevent crazy overflow layout bug on mobile */
	.body :global(*) {
		overflow-wrap: break-word;
	}

	.comment :global(pre) {
		overflow-x: auto;
	}
</style>