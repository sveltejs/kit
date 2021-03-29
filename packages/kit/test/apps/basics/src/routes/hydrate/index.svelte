<script context="module">
	export const hydrate = false;
</script>

<script>
	let n = 0;
</script>

<button on:click={() => n += 1}>
	clicks: {n}
</button>

<a href="/hydrate/other">other</a>