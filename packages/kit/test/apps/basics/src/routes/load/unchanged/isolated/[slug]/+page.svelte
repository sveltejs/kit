<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>slug: {data.slug}</h1>
<h2>count: {data.count}</h2>

<ul>
	<li><a href="/load/unchanged/isolated/a">/load/unchanged/isolated/a</a></li>
	<li><a href="/load/unchanged/isolated/b">/load/unchanged/isolated/b</a></li>
	<li><a href="/load/unchanged/uses-parent/a">/load/unchanged/uses-parent/a</a></li>
	<li><a href="/load/unchanged/uses-parent/b">/load/unchanged/uses-parent/b</a></li>
</ul>
