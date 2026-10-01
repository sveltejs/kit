<script>
	import { browser } from '$app/env';
	import { PUBLIC_ANSWER } from '$app/env/public';
</script>

<h1>The answer is {PUBLIC_ANSWER}</h1>

{#if browser}
	<h2>The dynamic answer is {PUBLIC_ANSWER}</h2>
{/if}
