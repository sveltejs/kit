<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/large-response/text.txt');
		const text = await res.text();

		return {
			props: {
				text
			}
		};
	}
</script>

<script>
	/** @type {string} */
	export let text;
</script>

<h1>text.length is {text.length}</h1>
