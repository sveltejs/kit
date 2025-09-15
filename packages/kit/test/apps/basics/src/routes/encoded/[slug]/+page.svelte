<script>
	import { page } from '$app/state';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>dynamic</h1>
<h2>{data.path}: {data.slug}</h2>
<h3>{page.url.pathname}: {page.params.slug}</h3>
