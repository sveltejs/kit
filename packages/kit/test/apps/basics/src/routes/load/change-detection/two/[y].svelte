<script context="module">
	let loads = 0;

	export async function load({ page }) {
		loads += 1;

		return {
			maxage: 5,
			props: {
				y: page.params.y,
				loads
			}
		};
	}
</script>

<script>
	export let y;
	export let loads;
</script>

<h1>y: {y}: {loads}</h1>