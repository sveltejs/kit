<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ error }) {
		return {
			stuff: {
				error: error?.message,
				value: 789
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
</script>

<button id="reload-button" on:click={() => goto($page.url.toString())}>Reload</button>
