<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			props: {
				// Needs to be an object, else Svelte will do by-value-comparison and skip rerender
				obj: {}
			}
		};
	}
</script>

<script>
	/** @type {any} */
	export let obj;

	let count = 0;
	$: obj && count++;
</script>

<h1>{count}</h1>
<slot />
