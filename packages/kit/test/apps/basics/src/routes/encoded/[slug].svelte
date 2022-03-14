<script context="module">
	/** @type {import('./[slug]').Load} */
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
	import { page } from '$app/stores';

	/** @type {string} */
	export let path;

	/** @type {string} */
	export let slug;
</script>

<h1>dynamic</h1>
<h2>{path}: {slug}</h2>
<h3>{$page.url.pathname}: {$page.params.slug}</h3>
