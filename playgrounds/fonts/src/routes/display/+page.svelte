<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-display" />

<article class="prose">
	<p class="meta">
		Route <code>/display</code> · Inter CSS only · Libre Barcode (<code>--font-display</code>)
		route-local · never preloaded
	</p>
	<h1>The display shelf</h1>
	<p>
		Inter still sets the body copy. The second family is Libre Barcode 128 Text from Fontsource,
		applied only on this route via <code>var(--font-display)</code>. It is not preloaded here or
		anywhere else.
	</p>
	<p class="ticket">HELLO CRUMB WORLD</p>
	<p>
		Think of the barcode as a vanity label on a jam jar: decorative, local, and absent from
		<code>/</code> and <code>/about</code>.
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

	.meta {
		font-size: 0.85rem;
		color: #6a5d4e;
	}

	.ticket {
		font-family: var(--font-display);
		font-size: 2rem;
		line-height: 1.4;
		letter-spacing: 0.04em;
	}

	code {
		font-size: 0.9em;
	}
</style>
