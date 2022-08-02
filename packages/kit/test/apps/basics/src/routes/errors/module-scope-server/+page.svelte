<script context="module">
	import { dev } from '$app/env';

	if (dev) { // can't throw in prod, the app won't start at all
		throw new Error('Crashing now');
	}
</script>
