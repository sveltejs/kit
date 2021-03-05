<script context="module">
	export async function load({ page, fetch }) {
		const res = await fetch(`/load/${page.params.dynamic}.json`);
		return {
			props: await res.json()
		}
	}
</script>

<script>
	export let name;
</script>

<h1>{name}</h1>
