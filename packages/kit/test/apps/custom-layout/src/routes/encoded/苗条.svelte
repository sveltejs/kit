<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ url }) {
		return {
			props: {
				path: url.pathname
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let path;
</script>

<h1>static</h1>
<h2>{path}</h2>
<h3>{$page.url.pathname}</h3>
