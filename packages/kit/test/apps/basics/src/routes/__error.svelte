<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ status, error, url }) {
		if (url.pathname === '/no-ssr/missing') {
			// load functions should not be called on the server if `ssr: false`
			throw new Error('load function was called erroneously');
		}

		return {
			props: { status, error }
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {number} */
	export let status;

	/** @type {Error} */
	export let error;

	if ($page.error !== error || $page.status !== status) {
		throw new Error('page store contains incorrect values');
	}
</script>

<svelte:head>
	<title>Custom error page: {error.message}</title>
</svelte:head>

<h1>{status}</h1>

<p id="message">This is your custom error page saying: "<b>{error.message}</b>"</p>

<pre id="stack">{error.stack}</pre>

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
