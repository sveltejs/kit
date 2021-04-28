<script context="module">
	/** @type {import("@sveltejs/kit").Load} */
	export async function load({ page, fetch }) {
		const res = await fetch(`/routing/fallthrough/${page.params.animal}.json`);

		if (res.ok) {
			const { type } = await res.json();

			if (type === 'animal') {
				return {
					props: {
						animal: page.params.animal
					}
				};
			}
		}
	}
</script>

<script>
	/** @type {string} */
	export let animal;
</script>

<h1>{animal} is an animal</h1>