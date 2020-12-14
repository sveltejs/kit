<script context="module">
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

	export let host;
	export let data;
</script>

<p>host from preload: {host}</p>
<p>host from page store: {$page.host}</p>
<p>host from endpoint: {data.host}</p>