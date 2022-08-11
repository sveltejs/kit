<script>
	import { session } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>answer via props: {data.answer}</h1>
<h2>answer via store: {$session.answer}</h2>
{#if data.answer === 43}
	<h3>answer via props is 43</h3>
{/if}
{#if $session.answer === 43}
	<h4>answer via store is 43</h4>
{/if}

<button on:click={() => ($session.answer += 1)}>+1</button>
