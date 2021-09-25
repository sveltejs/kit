<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch }) {
		const res = await fetch('/host.json');
		const data = await res.json();

		return {
			props: {
				host: page.host,
				data
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let host;

	/** @type {any} */
	export let data;
</script>

<p data-source="load">{host}</p>
<p data-source="store">{$page.host}</p>
<p data-source="endpoint">{data.host}</p>
