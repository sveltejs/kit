<script context="module">
	throw new Error("@migration task: Replace error load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3293209)");

// 	/** @type {import('@sveltejs/kit').Load} */
// 	export async function load({ status, error }) {
// 		return {
// 			props: {
// 				answer: 42,
// 				status,
// 				error
// 			}
// 		};
// 	}
</script>

<script>
	/** @type {import('./$types').Data} */
	export let data
</script>

<h1>Nested error page</h1>
<p id="nested-error-status">status: {data.status}</p>
<p id="nested-error-message">error.message: {data.error && data.error.message}</p>
<p id="nested-error-loaded">answer: {data.answer}</p>

<style>
	h1 {
		color: blue;
	}
</style>
