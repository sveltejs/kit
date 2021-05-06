<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
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
	/** @type {number} */
	export let random;
</script>

<h1>{random}</h1>
