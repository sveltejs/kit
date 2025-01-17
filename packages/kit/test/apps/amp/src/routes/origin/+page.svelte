<script>
	import { page } from '$app/state';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p data-source="load">{data.origin}</p>
<p data-source="store">{page.url.origin}</p>
<p data-source="endpoint">{data.data.origin}</p>
