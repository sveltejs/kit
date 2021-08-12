<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const url = '/load/fetch-request.json';

		// this is contrived, but saves us faffing about with node-fetch here
		const resource = browser ? new Request(url) : /** @type {RequestInfo} */ ({ url });

		const res = await fetch(resource);
		const { answer } = await res.json();

		return {
			props: { answer }
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<h1>the answer is {answer}</h1>
