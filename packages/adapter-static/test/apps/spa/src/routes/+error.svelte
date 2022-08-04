<script context="module">
	throw new Error("@migration task: Replace error load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3293209)");

	// /** @type {import('@sveltejs/kit').Load} */
	// export function load({ session }) {
	// 	return {
	// 		props: session
	// 	};
	// }
</script>

<script>
	import { browser } from '$app/env';
	import { page, session } from '$app/stores';

	/** @type {number} */
	export let count;

	if (browser) {
		$session.count += 1;
	}
</script>

<h1>{$page.status}</h1>
<h2>count: {count}</h2>

<button on:click={() => ($session.count += 1)}>+1</button>
