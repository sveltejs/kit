<script>
	/** @type {import('./$types').PageData} */
	export let data;

	let n = 0;
</script>

<button on:click={() => (n += 1)}>
	clicks: {n}
</button>

<a href="/{data.type}/other">other</a>
