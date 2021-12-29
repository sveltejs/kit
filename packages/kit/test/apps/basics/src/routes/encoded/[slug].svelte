<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ url, params }) {
		return {
			props: {
				path: url.pathname,
				slug: params.slug
			}
		};
	}
</script>

<script>
	import { url, params } from '$app/stores';

	/** @type {string} */
	export let path;

	/** @type {string} */
	export let slug;
</script>

<h1>dynamic</h1>
<h2>{path}: {slug}</h2>
<h3>{$url.pathname}: {$params.slug}</h3>
