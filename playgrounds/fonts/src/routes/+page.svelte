<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" preload />
<Font cssVariable="--font-home" />

<article class="prose">
	<p class="meta">
		Route <code>/</code> · Inter preloaded · Fraunces (<code>--font-home</code>) CSS only ·
		<code>font-display: swap</code>
	</p>
	<h1>The marmalade oration</h1>
	<p>
		Space hamsters convened in a teacup to debate whether toast is a vehicle or a destination. The
		chairweasel opened with a sonnet about crumbs, then adjourned to nibble the gavel.
	</p>
	<p>
		Meanwhile a parade of polite clouds drifted over the bakery, each one carrying a rumor that
		butter had unionized. No banners, no slogans, just the smell of warm bread and a shared
		<code>--font-inter</code> that this document hints with
		<code>&lt;link rel="preload" as="font"&gt;</code>. Fraunces styles the title through
		<code>font-family: var(--font-home)</code> in this component's <code>&lt;style&gt;</code> block and
		is never preloaded.
	</p>
</article>

<style>
	.prose {
		font-family: var(--font-inter);
		font-weight: 400;
	}

	h1 {
		font-family: var(--font-home);
		font-weight: 400;
		letter-spacing: -0.03em;
	}

	.meta {
		font-size: 0.85rem;
		color: #6a5d4e;
	}

	code {
		font-size: 0.9em;
	}
</style>
