<script context="module">
	throw new Error("@migration task: Replace error load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3293209)");

// 	/** @type {import('@sveltejs/kit').Load} */
// 	export function load({ error }) {
// 		return {
// 			stuff: {
// 				error: error?.message,
// 				value: 789
// 			}
// 		};
// 	}
</script>

<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
</script>

<button id="reload-button" on:click={() => goto($page.url.toString())}>Reload</button>
