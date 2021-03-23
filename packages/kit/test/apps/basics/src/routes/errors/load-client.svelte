<script context="module">
	import { browser } from '$app/env';

	export async function load() {
		if (browser) {
			throw new Error('Crashing now');
		}

		return {};
	}
</script>
