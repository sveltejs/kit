<script context="module">
import { browser } from '$app/env';


	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		if (browser) {
			await new Promise(f => {
				window.fulfil_navigation = f;
			});
		}

		return {};
	}
</script>

<h1>this should not appear</h1>