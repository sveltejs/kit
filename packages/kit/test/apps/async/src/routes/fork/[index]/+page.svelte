<script>
	let { params } = $props();

	async function load(index) {
		if (!index) throw new Error('missing index');
		return index;
	}

	const query_output = $derived(await load(params.index));
</script>

<p>Index {params.index}</p>
{query_output}
