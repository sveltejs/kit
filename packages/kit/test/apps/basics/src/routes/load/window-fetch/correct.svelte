<script context="module">
	/** @type {import('./__types/correct').Load} */
	export async function load({ url, fetch }) {
		const res = await fetch(`${url.origin}/load/window-fetch/data.json`);
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

<h1>{answer}</h1>
