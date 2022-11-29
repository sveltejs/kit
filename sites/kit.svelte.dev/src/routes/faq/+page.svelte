<script>
	import { Permalink } from '@sveltejs/site-kit';
	import '$lib/docs/client/docs.css';
	import '$lib/docs/client/shiki.css';
	import * as hovers from '$lib/docs/client/hovers.js';

	/** @type {import('./$types').PageData} */
	export let data;

	hovers.setup();
</script>

<svelte:head>
	<title>FAQ • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit FAQ" />
	<meta name="twitter:description" content="Frequently asked questions about SvelteKit" />
	<meta name="description" content="Frequently asked questions about SvelteKit" />
</svelte:head>

<div class="faqs">
	<h1>Frequently Asked Questions</h1>
	<div class="faqs-content listify">
		{#each data.sections as faq}
			<article class="faq">
				<h2 id={faq.slug}>
					{faq.title}
					<Permalink href="#{faq.slug}" />
				</h2>
				{@html faq.content}
			</article>
		{/each}
		<p>
			See also the <a href="https://svelte.dev/faq" rel="external">Svelte FAQ</a> for questions relating
			to Svelte directly.
		</p>
	</div>
</div>

<style>
	.faqs {
		grid-template-columns: 1fr 1fr;
		grid-gap: 1em;
		min-height: calc(100vh - var(--sk-nav-height));
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side) 6rem var(--sk-page-padding-side);
		/* max-width: var(--sk-line-max-width); */
		margin: 0 auto;
		tab-size: 2;
	}

	h1,
	.faqs-content {
		max-width: var(--sk-line-max-width);
		margin: 0 auto;
	}

	.faqs :global(.anchor) {
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

	.faqs :global(h2 > .anchor),
	.faqs :global(h3 > .anchor) {
		bottom: 0.3em;
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
			bottom: 0.25em;
		}
	}

	h2 {
		margin: 0rem 0 1rem 0;
		padding-top: 6rem;
		padding-bottom: 0.2rem;
		color: var(--sk-text-2);
		/* max-width: 24em; */
		/* font-size: var(--sk-text-m); */
		font-weight: 400;
		border-bottom: 1px solid #ddd;
	}

	.faqs :global(h3) {
		font-family: inherit;
		font-weight: 600;
		/* font-size: 2rem; */
		color: var(--sk-theme-2);
		margin: 2rem 0 1.6rem 0;
		padding-left: 0;
		background: transparent;
		line-height: 1.3;
		padding: 0;
		top: 0;
	}

	.faqs :global(a) {
		position: relative;
		z-index: 2;
	}

	/* TODO this page must be missing some styles from somewhere. the whole thing needs tidying up */
	.faqs :global(a) :global(code) {
		color: var(--sk-theme-1);
	}

	@media (max-width: 768px) {
		.faqs :global(.anchor) {
			transform: scale(0.6);
			opacity: 1;
			left: -1em;
		}
	}
</style>
