<script context="module">
	/** @type {import("../../../../../../../types").Load} */
	export async function load({ page, fetch }) {
		const res = await fetch(`/routing/fallthrough/mineral.json?q=${page.params.mineral}`);

		if (res.ok) {
			const { type } = await res.json();

			if (type === 'mineral') {
				return {
					props: {
						mineral: page.params.mineral
					}
				};
			}
		}
	}
</script>

<script>
	/** @type {string} */
	export let mineral;
</script>

<h1>{mineral} is a mineral</h1>