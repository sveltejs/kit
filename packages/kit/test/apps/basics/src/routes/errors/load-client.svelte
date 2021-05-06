<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		if (browser) {
			throw new Error('Crashing now');
		}

		return {};
	}
</script>
