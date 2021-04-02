<script context="module">
	/** @type {import('../../../../../../../../types').Load} */
	export function load({ page }) {
		const { path } = page;

		return {
			props: { path }
		};
	}
</script>

<script>
	/** @type {string} */
	export let path;
</script>

<h1>path: {path}</h1>