<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p>Page with server load</p>

<pre>{JSON.stringify(data)}</pre>

<a href="/load/server-data-reuse/no-load">No load page</a>
