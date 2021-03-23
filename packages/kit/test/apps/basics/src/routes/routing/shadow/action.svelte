<script context="module">
	export async function load({ fetch }) {
		const res = await fetch('/routing/shadow/action');
		const { random } = await res.json();

		return {
			props: {
				random
			}
		};
	}
</script>

<script>
	export let random;
</script>

<h1>{random}</h1>