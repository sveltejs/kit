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
	import { session } from '$app/stores';
	/** @type {any} */
	export let obj;

	let count = 0;
	$: obj && count++;
</script>

<h2>{count}</h2>
<button on:click={() => ($session.calls = 123)}>Update $session</button>
