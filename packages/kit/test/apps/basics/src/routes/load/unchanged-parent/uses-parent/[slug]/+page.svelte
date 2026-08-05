<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>slug: {data.slug}</h1>
<h2>count: {data.count}</h2>
<h3>doubled: {data.doubled}</h3>

<ul>
	<li><a href="/load/unchanged-parent/isolated/a">/load/unchanged-parent/isolated/a</a></li>
	<li><a href="/load/unchanged-parent/isolated/b">/load/unchanged-parent/isolated/b</a></li>
	<li><a href="/load/unchanged-parent/uses-parent/a">/load/unchanged-parent/uses-parent/a</a></li>
	<li><a href="/load/unchanged-parent/uses-parent/b">/load/unchanged-parent/uses-parent/b</a></li>
</ul>
