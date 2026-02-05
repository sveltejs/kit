<script>
	import { page } from '$app/state';
</script>

<h1>Nested error page</h1>
<p id="nested-error-status">status: {page.status}</p>
<p id="nested-error-message">error.message: {page.error.message}</p>

<style>
	h1 {
		color: blue;
	}
</style>
