<script context="module">
	export const hydrate = false;

	/** @type {import('../../../../../../types').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/hydrate.json');

		/** @type {any} */
		const { type } = await res.json();

		return {
			props: { type }
		}
	}
</script>

<script>
	/** @type {string} */
	export let type;

	let n = 0;
</script>

<button on:click={() => n += 1}>
	clicks: {n}
</button>

<a href="/{type}/other">other</a>