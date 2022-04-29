<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch }) {
		const res = await fetch(`/load/${params.dynamic}.json`);
		return {
			props: await res.json()
		};
	}
</script>

<script>
	/** @type {string} */
	export let name;
</script>

<h1>{name}</h1>
