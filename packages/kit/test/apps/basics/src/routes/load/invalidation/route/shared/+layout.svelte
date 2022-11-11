<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<h1>route.id: {data.route.id}</h1>
<slot />

<a href="/load/invalidation/route/shared/a">/load/invalidation/route/shared/a</a>
<a href="/load/invalidation/route/shared/b">/load/invalidation/route/shared/b</a>
