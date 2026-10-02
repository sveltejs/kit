<script>
	import { page } from '$app/state';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1 class="destination">destination</h1>

<pre class="destination-form">{JSON.stringify(form)}</pre>
<span class="status">{page.status}</span>
<span class="loaded-at">{data.loaded_at}</span>
<pre class="layout-loaded-at">{data.layout_loaded_at}</pre>
<pre class="load-search">{data.search}</pre>
