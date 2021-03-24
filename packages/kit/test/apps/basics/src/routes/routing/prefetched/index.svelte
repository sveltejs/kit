<script context="module">
	export async function load({ fetch }) {
		const letter = await fetch('/routing/prefetched.json').then(r => r.json());
		return { props: { letter } };
	}
</script>

<script>
	export let letter;
</script>

<h1>{letter}</h1>