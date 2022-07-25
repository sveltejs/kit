<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ session }) {
		session; // not necessary, but prevents the argument from being marked as unused

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

<h1>{count}</h1>
<button on:click={() => ($session.calls = 123)}>Rerun Layout Load Function</button>
<slot />
