<script context="module">
	/** @type {import("@sveltejs/kit").Load} */
	export async function load({ params, fetch }) {
		const res = await fetch(`/routing/fallthrough-advanced/${params.vegetable}.json`);

		if (res.ok) {
			const { type } = await res.json();

			if (type === 'vegetable') {
				return {
					props: {
						vegetable: params.vegetable
					}
				};
			}
		}
		return { fallthrough: true };
	}
</script>

<script>
	/** @type {string} */
	export let vegetable;
</script>

<h1>{vegetable} is a vegetable</h1>
