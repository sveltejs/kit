<script context="module">
	export async function load({ fetch }) {
		const res = await fetch('/load/serialization.json');
		return {
			props: await res.json()
		}
	}
</script>

<script>
	export let answer;
</script>

<h1>{answer}</h1>