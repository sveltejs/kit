<script>
	import { browser } from '$app/environment';
	import { PUBLIC_ANSWER } from '$env/static/public';
	import { env } from '$env/dynamic/public';
</script>

<h1>The answer is {PUBLIC_ANSWER}</h1>

{#if browser}
	<h2>The dynamic answer is {env.PUBLIC_ANSWER}</h2>
{/if}
