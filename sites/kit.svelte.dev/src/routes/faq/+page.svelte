<script>
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

<div class="faqs text">
	<h1>Frequently Asked Questions</h1>
	<div class="faqs-content listify">
		{#each data.sections as faq}
			<article class="faq">
				<h2 id={faq.slug}>
					{faq.title}

					<a href="#{faq.slug}" class="anchor">
						<span class="visually-hidden">permalink</span>
					</a>
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
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side) var(--sk-page-padding-bottom)
			var(--sk-page-padding-side);
	}

	h1,
	.faqs-content {
		max-width: var(--sk-line-max-width);
		margin: 0 auto;
	}

	/* TODO this page must be missing some styles from somewhere. the whole thing needs tidying up */
	.faqs :global(a) :global(code) {
		color: var(--sk-theme-1);
	}
</style>
