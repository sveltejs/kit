<script context="module">
	let count = 0;

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/change-detection/data.json');
		const { type } = await res.json();

		count += 1;

		return {
			maxage: 5,
			props: {
				type,
				loads: count
			},
			dependencies: ['custom:change-detection-layout']
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
