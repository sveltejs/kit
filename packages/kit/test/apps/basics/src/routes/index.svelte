<script context="module">
	/** @type {import('@sveltejs/kit').Load}*/
	export async function load({ fetch }) {
		const res = await fetch('/answer.json');
		const { answer } = await res.json();

		return {
			props: { answer }
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<!-- ensure route_preprocessor don't mess this up -->
<svelte:body on:dblclick={() => {}} />

<h1>the answer is {answer}</h1>
