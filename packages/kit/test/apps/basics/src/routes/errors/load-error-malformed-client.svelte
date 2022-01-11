<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		if (browser) {
			// @ts-expect-error - given value expected to throw
			return { status: 555, error: {} };
		}

		return {};
	}
</script>
