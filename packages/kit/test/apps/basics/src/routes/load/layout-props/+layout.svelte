<script>
	/** @type {import('./$types').LayoutData} */
	export let data;

	let count = 0;
	$: data.obj && count++;
</script>

<h1>{count}</h1>
<slot />
