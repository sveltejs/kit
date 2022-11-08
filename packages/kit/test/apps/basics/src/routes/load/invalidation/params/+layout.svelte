<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<slot />

<pre>{JSON.stringify({
		a: data.a,
		b: data.b
	})}</pre>

<a href="/load/invalidation/params/1">1</a>
<a href="/load/invalidation/params/1/x">1/x</a>
