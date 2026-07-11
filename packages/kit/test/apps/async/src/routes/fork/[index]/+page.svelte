<script lang="ts">
	let { params } = $props();

	function load(index: string) {
		if (!index) throw new Error('missing index');
		return Promise.resolve(index);
	}

	const query_output = $derived(await load(params.index));
</script>

<p>Index {params.index}</p>
{query_output}
