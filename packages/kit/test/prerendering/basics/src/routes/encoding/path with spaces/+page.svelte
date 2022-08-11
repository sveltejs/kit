<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p id="a">{data.a.path}</p>
<p id="b">{data.b.path}</p>

<a href="/encoding/dynamic path with spaces">dynamic path with spaces</a>
<a href="/encoding/dynamic%20path%20with%20encoded%20spaces">dynamic path with encoded spaces</a>
