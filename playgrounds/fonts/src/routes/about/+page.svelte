<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-serif" />

<article class="prose">
	<p class="meta">
		Route <code>/about</code> · Inter CSS only · Lora (<code>--font-serif</code>) used, never
		preloaded
	</p>
	<h1>About the crumb committee</h1>
	<p>
		This page still wears Inter through <code>font-family: var(--font-inter)</code>, but it does not
		emit a preload hint. After a visit to <code>/</code>, the self-hosted files should already sit
		in the HTTP cache.
	</p>
	<p class="serif">
		Lora is family D: applied here via <code>var(--font-serif)</code> in a Svelte
		<code>&lt;style&gt;</code> block, and it must not produce
		<code>&lt;link rel="preload" as="font"&gt;</code> on this route or any other. Default preload stays
		off.
	</p>
	<p>
		The committee minutes record that jam is a condiment, not a personality, and that marmots may
		vote if they bring their own spoons. There are no advertisements in these minutes, only the
		solemn business of crumbs.
	</p>
</article>

<style>
	.prose {
		font-family: var(--font-inter);
		font-weight: 400;
	}

	h1 {
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	.serif {
		font-family: var(--font-serif);
		font-style: italic;
	}

	.meta {
		font-size: 0.85rem;
		color: #6a5d4e;
	}

	code {
		font-size: 0.9em;
	}
</style>
