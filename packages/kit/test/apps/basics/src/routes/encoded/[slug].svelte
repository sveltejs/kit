<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ page }) {
		return {
			props: {
				path: page.path,
				slug: page.params.slug
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
<h3>{$page.path}: {$page.params.slug}</h3>
