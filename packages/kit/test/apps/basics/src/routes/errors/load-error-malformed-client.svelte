<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		if (typeof window !== 'undefined') {
			// @ts-ignore
			return { status: 555, error: {} };
		}

		return {};
	}
</script>
