<script context="module">
	export const prerender = true;
</script>

<script>
	import { Permalink } from '@sveltejs/site-kit';

	export let sections;
</script>

<svelte:head>
	<title>FAQ • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit FAQ" />
	<meta name="twitter:description" content="Frequently asked questions about SvelteKit" />
	<meta name="description" content="Frequently asked questions about SvelteKit" />
</svelte:head>

<div class="faqs stretch">
	<h1>Frequently Asked Questions</h1>
	{#each sections as faq}
		<article class="faq">
			<h2>
				<span id={faq.slug} class="offset-anchor" />
				{faq.title}
				<Permalink href="/faq#{faq.slug}" />
			</h2>
			{@html faq.content}
		</article>
	{/each}
	<p>
		See also the <a href="https://svelte.dev/faq" rel="external">Svelte FAQ</a> for questions relating
		to Svelte directly.
	</p>
</div>

<style>
	.faqs {
		grid-template-columns: 1fr 1fr;
		grid-gap: 1em;
		min-block-size: calc(100vh - var(--nav-h));
		padding-inline: var(--side-nav);
		padding-block: var(--top-offset) 6rem;
		max-inline-size: var(--main-width);
		margin-inline: auto;
		margin-block: 0;
		tab-size: 2;
	}

	.faqs :global(pre) :global(code) {
		padding: 0;
		margin: 0;
		inset-block-start: 0;
		background: transparent;
		color: white;
	}

	.faqs :global(pre) {
		margin: 0;
		margin-block-end: 2rem;
		inline-size: 100%;
		max-inline-size: var(--linemax);
		padding-inline: 2.5rem;
		padding-block: 1.5rem;
		background: #333;
		border-radius: 0.5rem;
		font-size: 0.8rem;
	}

	.faqs :global(.offset-anchor) {
		position: relative;
		display: block;
		inset-block-start: calc(-1 * var(--top-offset));
		inline-size: 0;
		block-size: 0;
	}

	.faqs :global(.anchor) {
		position: absolute;
		display: block;
		background: url(@sveltejs/site-kit/icons/link.svg) 0 50% no-repeat;
		background-size: 1em 1em;
		inline-size: 1.4em;
		block-size: 1em;
		inset-inline-start: -1.3em;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.faqs :global(h2 > .anchor),
	.faqs :global(h3 > .anchor) {
		inset-block-start: 0.2em;
	}

	@media (min-width: 768px) {
		.faqs :global(.anchor:focus),
		.faqs :global(h2):hover :global(.anchor),
		.faqs :global(h3):hover :global(.anchor),
		.faqs :global(h4):hover :global(.anchor),
		.faqs :global(h5):hover :global(.anchor),
		.faqs :global(h6):hover :global(.anchor) {
			opacity: 1;
		}

		.faqs :global(h5) :global(.anchor),
		.faqs :global(h6) :global(.anchor) {
			inset-block-start: 0.25em;
		}
	}

	h2 {
		margin-block: 3.5rem 1rem;
		padding-block-end: 0.2rem;
		color: var(--text);
		/* max-inline-size: 24em; */
		font-size: var(--h3);
		font-weight: 400;
		border-block-end: 1px solid #ddd;
	}

	.faqs :global(h3) {
		font-family: inherit;
		font-weight: 600;
		font-size: 2rem;
		color: var(--second);
		margin-block: 2rem 1.6rem;
		padding-inline-start: 0;
		background: transparent;
		line-height: 1.3;
		padding: 0;
		inset-block-start: 0;
	}

	.faq:first-child {
		margin: 0;
		margin-block: 2rem;
		padding-block-end: 4rem;
		border-block-end: var(--border-w) solid #6767785b; /* based on --second */
	}
	.faq:first-child h2 {
		font-size: 4rem;
		font-weight: 400;
		color: var(--second);
	}

	:global(.faqs .faq ul) {
		margin-inline-start: 3.2rem;
	}

	.faqs :global(.anchor) {
		inset-block-start: calc((var(--h3) - 24px) / 2);
	}

	@media (max-width: 768px) {
		.faqs :global(.anchor) {
			transform: scale(0.6);
			opacity: 1;
			inset-inline-start: -1em;
		}
	}
</style>
