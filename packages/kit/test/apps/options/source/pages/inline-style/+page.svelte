<script>
	import SharedCSS from '$lib/SharedCSS.svelte';
	// @ts-ignore this is a vite font import so it has no side-effect types
	import '@fontsource/libre-barcode-128-text';
</script>

<p>
	Test that the fontsource is referenced correctly, while the shared CSS in SharedCSS doesn't cause
	problems
</p>
<SharedCSS />

<style>
	p {
		font-family: 'Libre Barcode 128 Text', sans-serif;
	}
</style>
