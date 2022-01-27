<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/file with spaces.json');
		return {
			props: await res.json()
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<h1>answer: {answer}</h1>
