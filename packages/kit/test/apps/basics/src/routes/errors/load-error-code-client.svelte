<script context="module">
	export async function load() {
		if (typeof window !== 'undefined') {
			return { status: 500 };
		}

		return {};
	}
</script>
