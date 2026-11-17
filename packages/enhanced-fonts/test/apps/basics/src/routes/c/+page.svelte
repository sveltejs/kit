<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-a" />
<Font cssVariable="--font-c" preload />

<h1 class="a">Route C uses A without preload</h1>
<p class="c">Font C optional preload</p>

<style>
	.a {
		font-family: var(--font-a);
	}

	.c {
		font-family: var(--font-c);
	}
</style>
