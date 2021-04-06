<script context="module">
	export async function load() {
		return {
			props: {
				answer: 42
			}
		};
	}
</script>

<script>
	/** @type {number} */
	export let status;

	/** @type {Error} */
	export let error;

	/** @type {number} */
	export let answer;
</script>

<h1>Nested error page</h1>
<p id="nested-error-status">status: {status}</p>
<p id="nested-error-message">error.message: {error && error.message}</p>
<p id="nested-error-loaded">answer: {answer}</p>

<style>
	h1 {
		color: blue;
	}
</style>