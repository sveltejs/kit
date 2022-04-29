<script context="module">
	/** @type {import('@sveltejs/kit').Load}*/
	export async function load({ fetch }) {
		const res = await fetch('/answer.json');
		const { answer } = await res.json();

		return {
			props: { answer }
		};
	}
</script>

<script>
	import './index.css';

	/** @type {number} */
	export let answer;
</script>

<h1>the answer is {answer}</h1>
