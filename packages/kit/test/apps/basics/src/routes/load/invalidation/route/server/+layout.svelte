<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<h1>route.id: {data.route.id}</h1>
<slot />

<a href="/load/invalidation/route/server/a">/load/invalidation/route/server/a</a>
<a href="/load/invalidation/route/server/b">/load/invalidation/route/server/b</a>
