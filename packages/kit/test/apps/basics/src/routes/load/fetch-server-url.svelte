<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch(
			browser ? '/load/fetch-server-url.json' : '/load/fetch-server-url-server.json',
			{
				serverUrl: '/load/fetch-server-url-server.json'
			}
		);
		return {
			props: await res.json()
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<h1>{answer}</h1>
