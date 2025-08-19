<script>
	import { page } from '$app/state';

	let answer = 42; // TODO migration leftover, was returned from load previously
</script>

<h1>Nested error page</h1>
<p id="nested-error-status">status: {page.status}</p>
<p id="nested-error-message">error.message: {page.error && page.error.message}</p>
<p id="nested-error-loaded">answer: {answer}</p>

<style>
	h1 {
		color: blue;
	}
</style>
