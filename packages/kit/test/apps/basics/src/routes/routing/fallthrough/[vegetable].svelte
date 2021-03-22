<script context="module">
	/** @type {import("../../../../../../../types").Load} */
	export async function load({ page, fetch }) {
		const res = await fetch(`/routing/fallthrough/${page.params.vegetable}.json`);

		if (res.ok) {
			const { type } = await res.json();

			if (type === 'vegetable') {
				return {
					props: {
						vegetable: page.params.vegetable
					}
				};
			}
		}
	}
</script>

<script>
	/** @type {string} */
	export let vegetable;
</script>

<h1>{vegetable} is a vegetable</h1>