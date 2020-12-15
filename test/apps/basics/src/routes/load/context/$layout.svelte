<script context="module">
	export async function load() {
		return {
			context: {
				message: 'original'
			}
		};
	}
</script>

<slot></slot>