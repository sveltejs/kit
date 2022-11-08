<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<h1>{data.type} loads: {data.loads}</h1>
<slot />
