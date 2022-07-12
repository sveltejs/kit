<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		await new Promise((f) => setTimeout(f, 1000));
		return {};
	}
</script>

<p>c</p>
