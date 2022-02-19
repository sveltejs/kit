<script context="module">
	export const prerender = true;
</script>

<script>
	export let children;
</script>

<svelte:head>
	<title>Type Definitions • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit Type Definitions" />
	<meta name="twitter:description" content="Type Definitions for SvelteKit" />
	<meta name="description" content="Type Definitions for SvelteKit" />
</svelte:head>

<div class="types stretch">
	<h1>Type Definitions</h1>
	<h3>Classes</h3>
	<ul>
		{#each children as child}
			{#if child.kindString === 'Class'}
				<li>
					<a href={`types/${child.name}`}>
						{child.name}
					</a>
				</li>
			{/if}
		{/each}
	</ul>
	<h3>Interfaces</h3>
	<ul>
		{#each children as child}
			{#if child.kindString === 'Interface'}
				<li>
					<a href={`types/${child.name}`}>
						{child.name}
					</a>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<style>
	.types {
		grid-template-columns: 1fr 1fr;
		grid-gap: 1em;
		min-height: calc(100vh - var(--nav-h));
		padding: var(--top-offset) var(--side-nav) 6rem var(--side-nav);
		max-width: var(--main-width);
		margin: 0 auto;
		tab-size: 2;
	}

	.types :global(pre) :global(code) {
		padding: 0;
		margin: 0;
		top: 0;
		background: transparent;
	}

	.types :global(pre) {
		margin: 0;
		margin-bottom: 2rem;
		width: 100%;
		max-width: var(--linemax);
		padding: 1.5rem 2.5rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
	}

	.types :global(.anchor) {
		position: absolute;
		display: block;
		background: url(@sveltejs/site-kit/icons/link.svg) 0 50% no-repeat;
		background-size: 1em 1em;
		width: 1.4em;
		height: 1em;
		left: -1.3em;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.types :global(h2 > .anchor),
	.types :global(h3 > .anchor) {
		bottom: 0.3em;
	}

	@media (min-width: 768px) {
		.types :global(.anchor:focus),
		.types :global(h2):hover :global(.anchor),
		.types :global(h3):hover :global(.anchor),
		.types :global(h4):hover :global(.anchor),
		.types :global(h5):hover :global(.anchor),
		.types :global(h6):hover :global(.anchor) {
			opacity: 1;
		}

		.types :global(h5) :global(.anchor),
		.types :global(h6) :global(.anchor) {
			bottom: 0.25em;
		}
	}

	h2 {
		margin: -4rem 0 1rem 0;
		padding-top: 10rem;
		padding-bottom: 0.2rem;
		color: var(--text);
		/* max-width: 24em; */
		font-size: var(--h3);
		font-weight: 400;
		border-bottom: 1px solid #ddd;
	}

	.types :global(h3) {
		font-family: inherit;
		font-weight: 600;
		font-size: 2rem;
		color: var(--second);
		margin: 2rem 0 1.6rem 0;
		padding-left: 0;
		background: transparent;
		line-height: 1.3;
		padding: 0;
		top: 0;
	}

	.types :global(a) {
		position: relative;
		z-index: 2;
	}

	/* TODO this page must be missing some styles from somewhere. the whole thing needs tidying up */
	.types :global(a) :global(code) {
		color: var(--prime);
	}

	.type:first-child {
		margin: 2rem 0;
		padding-bottom: 4rem;
		border-bottom: var(--border-w) solid #6767785b; /* based on --second */
	}
	.type:first-child h2 {
		font-size: 4rem;
		font-weight: 400;
		color: var(--second);
	}

	:global(.types ul) {
		margin-left: 3.2rem;
	}

	@media (max-width: 768px) {
		.types :global(.anchor) {
			transform: scale(0.6);
			opacity: 1;
			left: -1em;
		}
	}
</style>
