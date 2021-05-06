<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return { status: 555, error: new Error };
	}
</script>
