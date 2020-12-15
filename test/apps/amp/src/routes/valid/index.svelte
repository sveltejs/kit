<script context="module">
	export async function load({ fetch }) {
		const res = await fetch('/valid.json');
		return {
			props: await res.json()
		};
	}
</script>

<script>
	import { browser, dev, amp } from '$app/env';
	export let answer;
</script>

<p>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</p>

<p>The answer is {answer}</p>

{#if amp}
	<p>amp is true</p>
{/if}