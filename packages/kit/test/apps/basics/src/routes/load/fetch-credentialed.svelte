<script context="module">
	/** @type {import('../../../../../../types').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/load/fetch-credentialed.json');

		/** @type {any} */
		const { name } = await res.json();

		return {
			props: {
				name
			}
		};
	}
</script>

<script>
	/** @type {string} */
	export let name;
</script>

<h1>Hello {name}!</h1>