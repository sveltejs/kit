<script context="module">
	import { browser } from '$app/env';

	if (browser) {
		throw new Error('Crashing now');
	}
</script>
