<script>
	import Search from '$lib/search/Search.svelte';
	import SearchResults from '$lib/search/SearchResults.svelte';

	/** @type {import('$lib/search/types').Block[]} */
	export let results;

	/** @type {string} */
	export let query;
</script>

<main>
	<Search q={query} interactive={false} />
	<!-- <form>
		<input name="q" value={query} />
	</form> -->

	<SearchResults {results} {query} />
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 8rem 1rem;
	}

	h1 {
		font-size: var(--h1);
	}

	input {
		width: 100%;
		font-family: inherit;
		font-size: inherit;
		border: 1px solid #ccc;
		border-radius: var(--border-r);
		padding: 0.8rem;
		margin: 2em 0;
	}
</style>
