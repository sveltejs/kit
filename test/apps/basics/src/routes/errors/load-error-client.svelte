<script context="module">
	export async function load() {
		if (typeof window !== 'undefined') {
			return { status: 555, error: new Error('Not found') };
		}
	}
</script>
