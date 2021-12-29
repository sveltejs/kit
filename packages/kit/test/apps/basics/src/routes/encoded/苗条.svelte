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
	import { url } from '$app/stores';

	/** @type {string} */
	export let path;
</script>

<h1>static</h1>
<h2>{path}</h2>
<h3>{$url.pathname}</h3>
