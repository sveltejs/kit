<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, fetch }) {
		const href = `http://localhost:${url.searchParams.get('port')}/server-fetch-request.json`;

		const res = await fetch(href);
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
