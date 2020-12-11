<script context="module">
	export async function preload(page) {
		const res = await this.fetch('/host.json');
		const data = await res.json();

		return {
			host: page.host,
			data
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