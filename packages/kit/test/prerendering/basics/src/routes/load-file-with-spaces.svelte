<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const r1 = await fetch('/file%20with%20spaces.json');
		const p1 = await r1.json();

		const r2 = await fetch('/file with spaces.json');
		const p2 = await r2.json();

		if (p1.answer !== p2.answer) {
			throw new Error('oops');
		}

		return {
			props: p1
		};
	}
</script>

<script>
	/** @type {number} */
	export let answer;
</script>

<h1>answer: {answer}</h1>
