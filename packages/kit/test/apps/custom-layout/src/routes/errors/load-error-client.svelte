<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		if (typeof window !== 'undefined') {
			return { status: 555, error: new Error('Not found') };
		}

		return {};
	}
</script>
