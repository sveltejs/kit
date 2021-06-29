<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch }) {
		const url = `http://localhost:${page.query.get('port')}/server-fetch-request.json`;

		// @ts-ignore
		const res = await fetch(url);
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

<h1>the answer is {answer}</h1>
