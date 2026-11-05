<script>
	import { page } from '$app/state';

	/** @type {App.Error} */
	export let error;

	if (page.url.searchParams.has('fail_error')) {
		// @ts-expect-error compiled components should be called without a `this` binding
		if (this !== undefined) {
			throw new Error('error component was called with a bound `this`');
		}

		throw new Error(`nested error render failed: ${error.message}`);
	}
</script>

<h1>Nested error page</h1>
<p id="nested-error-status">status: {page.status}</p>
<p id="nested-error-message">error.message: {page.error && page.error.message}</p>

<style>
	h1 {
		color: blue;
	}
</style>
