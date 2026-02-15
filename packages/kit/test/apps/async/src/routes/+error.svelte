<script>
	import { page } from '$app/state';

	let { error } = $props();
</script>

<svelte:head>
	<title>Custom error page: {error.message}</title>
</svelte:head>

<!-- TODO what about status in a world of error boundaries? pass as prop, too? -->
<h1>{page.status}</h1>

<p id="message">This is your custom error page saying: "<b>{error.message}</b>"</p>

<style>
	h1,
	p {
		margin: 0 auto;
	}

	h1 {
		font-size: 2.8em;
		font-weight: 700;
		margin: 0 0 0.5em 0;
		color: red;
	}

	p {
		margin: 1em auto;
	}

	@media (min-width: 480px) {
		h1 {
			font-size: 4em;
		}
	}
</style>
