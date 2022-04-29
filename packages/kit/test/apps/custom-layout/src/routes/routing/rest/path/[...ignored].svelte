<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ url }) {
		const { pathname: path } = url;

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
