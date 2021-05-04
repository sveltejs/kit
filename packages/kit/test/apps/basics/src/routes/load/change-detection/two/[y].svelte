<script context="module">
	let loads = 0;

	/** @type {import('@sveltejs/kit').Load} */
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
	/** @type {string} */
	export let y;

	/** @type {number} */
	export let loads;
</script>

<h2>y: {y}: {loads}</h2>
