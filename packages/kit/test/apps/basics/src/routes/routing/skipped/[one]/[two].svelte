<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ page }) {
		return { props: page.params };
	}
</script>

<script>
	/** @type {string} */
	export let one;

	/** @type {string} */
	export let two;
</script>

<h1>{one}/{two}</h1>

<a href="../y/1" id="goto-y1">next</a>
