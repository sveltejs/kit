<script context="module">
	let loads = 0;

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, uses }) {
		uses('change-detection-layout');
		const res = await fetch('/load/change-detection/data.json');
		const { type } = await res.json();

		loads += 1;

		return {
			maxage: 5,
			props: {
				type,
				loads
			}
		};
	}
</script>

<script>
	/** @type {string} */
	export let type;

	/** @type {number} */
	export let loads;
</script>

<h1>{type} loads: {loads}</h1>
<slot></slot>
