<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ session }) {
		return {
			props: {
				answer: session.answer
			}
		};
	}
</script>

<script>
	import { session } from '$app/stores';

	/** @type {number} */
	export let answer;
</script>

<h1>answer via props: {answer}</h1>
<h2>answer via store: {$session.answer}</h2>
{#if answer === 43}
	<h3>answer via props is 43</h3>
{/if}
{#if $session.answer === 43}
	<h4>answer via store is 43</h4>
{/if}

<button on:click={() => $session.answer += 1}>+1</button>
