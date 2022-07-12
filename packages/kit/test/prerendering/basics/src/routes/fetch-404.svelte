<script context="module">
	/** @type {import('./__types/fetch-404').Load} */
	export async function load({ fetch }) {
		const { status } = await fetch('/missing.json');

		return {
			props: { status }
		};
	}
</script>

<script>
	/** @type {number} */
	export let status;
</script>

<h1>status: {status}</h1>
