<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<h1>route.id: {data.route.id}</h1>
<h2>random id: {data.random}</h2>
<slot />

<a href="/load/invalidation/route/shared/a">/load/invalidation/route/shared/a</a>
<a href="/load/invalidation/route/shared/b">/load/invalidation/route/shared/b</a>

<a href="/load/invalidation/route/shared/unchanged-x">/load/invalidation/route/shared/unchanged-x</a
>
<a href="/load/invalidation/route/shared/unchanged-y">/load/invalidation/route/shared/unchanged-y</a
>
