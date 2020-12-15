<script context="module">
	let loads = 0;

	export async function load({ page }) {
		loads += 1;

		return {
			maxage: 5,
			props: {
				x: page.params.x,
				loads
			}
		};
	}
</script>

<script>
	export let x;
	export let loads;
</script>

<h1>x: {x}: {loads}</h1>