<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/relay.json');
		return {
			props: {
				answer: await res.json()
			}
		}
	}
</script>

<script>
	/** @type {string} */
	export let answer;
</script>

<h1>{answer}</h1>
