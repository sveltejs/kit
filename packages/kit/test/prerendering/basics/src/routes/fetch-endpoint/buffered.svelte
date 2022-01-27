<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const url = '/fetch-endpoint/buffered.json';
		const res = await fetch(url);

		return {
			props: await res.json()
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<h1>the answer is {answer}</h1>
