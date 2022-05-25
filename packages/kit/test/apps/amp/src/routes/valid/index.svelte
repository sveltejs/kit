<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/valid.json');
		return {
			props: await res.json()
		};
	}
</script>

<script>
	import { browser, dev } from '$app/env';

	/** @type {number} */
	export let answer;
</script>

<h1>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</h1>
<h2>The answer is {answer}</h2>
<p>This text is red</p>

<style>
	p {
		color: red;
	}
</style>
