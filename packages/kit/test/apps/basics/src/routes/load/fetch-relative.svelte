<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const get = await fetch('fetch-relative.json');
		const post = await fetch('fetch-relative.json', { method: 'post', body: '?' });

		return {
			props: { ...(await get.json()), ...(await post.json()) }
		};
	}
</script>

<script>
	export let answer;
	export let question;
</script>

<h1>the answer is {answer}</h1>
<h2>the question was {question}</h2>
