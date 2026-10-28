<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-a" />
<Font cssVariable="--font-d" />

<h1 class="a">Route B uses A without preload</h1>
<p class="d">Font D is used and never preloaded</p>

<style>
	.a {
		font-family: var(--font-a);
	}

	.d {
		font-family: var(--font-d);
	}
</style>
