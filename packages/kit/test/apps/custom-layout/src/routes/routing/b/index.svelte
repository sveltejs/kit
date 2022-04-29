<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const letter = await fetch('/routing/b.json').then(r => r.json());
		return { props: { letter } };
	}
</script>

<script>
	/** @type {string} */
	export let letter;
</script>

<h1>{letter}</h1>
