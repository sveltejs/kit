<script context="module">
	let loads = 0;

	/** @type {import('@sveltejs/kit').Load} */
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
	/** @type {string} */
	export let x;

	/** @type {number} */
	export let loads;
</script>

<h2>x: {x}: {loads}</h2>
