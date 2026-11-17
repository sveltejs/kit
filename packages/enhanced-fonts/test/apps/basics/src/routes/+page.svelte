<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-a" preload />
<Font cssVariable="--font-b" />

<h1 class="a">Font A preloaded</h1>
<p class="b">Font B CSS only</p>

<style>
	.a {
		font-family: var(--font-a);
	}

	.b {
		font-family: var(--font-b);
	}
</style>
