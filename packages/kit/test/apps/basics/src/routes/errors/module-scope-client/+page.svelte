<script context="module">
	import { browser } from '$app/environment';

	if (browser) {
		throw new Error('Crashing now');
	}
</script>
