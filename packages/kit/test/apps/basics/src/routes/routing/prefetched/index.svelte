<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const message = await fetch('/routing/prefetched.json').then(r => r.json());
		return { props: { message } };
	}
</script>

<script>
	/** @type {string} */
	export let message;
</script>

<h1>{message}</h1>