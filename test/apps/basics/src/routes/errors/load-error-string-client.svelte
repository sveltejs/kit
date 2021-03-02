<script context="module">
	export async function load() {
		if (typeof window !== 'undefined') {
			return { status: 555, error: 'Not found' };
		}
	}
</script>
