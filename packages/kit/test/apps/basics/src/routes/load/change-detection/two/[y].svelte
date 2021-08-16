<script context="module">
	let count = 0;

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page }) {
		count += 1;

		return {
			maxage: 5,
			props: {
				y: page.params.y,
				loads: count
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
