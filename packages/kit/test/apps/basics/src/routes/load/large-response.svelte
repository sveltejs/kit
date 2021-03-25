<script context="module">
	/** @type {import('../../../../../../types').Load} */
	export async function load({ page, fetch }) {
		const res = await fetch(`http://localhost:${page.query.get('port')}/large-response.json`)
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