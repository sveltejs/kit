<script context="module">
	import { browser } from '$app/env';

	let count = 0;

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params }) {
		if (browser) {
			count += 1;
		}

		return {
			maxage: 5,
			props: {
				x: params.x,
				loads: count
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
