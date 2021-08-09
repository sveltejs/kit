<script context="module">
	import { base, assets } from '$app/paths';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch }) {
		return {
			props: {
				data: {
					base,
					assets
				}
			}
		};
	}
</script>

<script>
	/** @type {any} */
	export let data;
</script>

<p data-source="base">{data.base}</p>
<p data-source="assets">{data.assets}</p>
