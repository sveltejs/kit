<script>
	import { dev } from '$app/environment';

	if (dev) {
		// can't throw in prod, the app won't start at all
		throw new Error('Crashing now');
	}
</script>
