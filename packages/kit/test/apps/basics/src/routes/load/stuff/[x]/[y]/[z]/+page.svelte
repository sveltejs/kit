<script>
	/** @type {import('./$types').Data} */
	export let data;
</script>

<h1>message: {data.message}</h1>
<pre>{JSON.stringify({ data.x, data.y, data.z })}</pre>
