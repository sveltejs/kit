<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, fetch }) {
		const res = await fetch('/origin.json');
		const data = await res.json();

		return {
			props: {
				origin: url.origin,
				data
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let origin;

	/** @type {any} */
	export let data;
</script>

<p data-source="load">{origin}</p>
<p data-source="store">{$page.url.origin}</p>
<p data-source="endpoint">{data.origin}</p>
