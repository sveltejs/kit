<script context="module">
	/** @type {import("@sveltejs/kit").Load} */
	export async function load({ page, fetch }) {
		const res = await fetch(`/routing/fallthrough-advanced/${page.params.mineral}.json`);

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