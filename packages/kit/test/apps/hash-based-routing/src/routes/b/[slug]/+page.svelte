<script>
	import { page } from '$app/state';
	let { data } = $props();
</script>

<p data-data>
	{JSON.stringify(data.params)}
	{data.route.id}
	{data.url.pathname + data.url.search + data.url.hash}
</p>

<p data-page>
	{JSON.stringify(page.params)}
	{page.route.id}
	{page.url.pathname + page.url.search + page.url.hash}
</p>
