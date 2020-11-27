<script context="module">
	export async function preload() {
		if (typeof window !== 'undefined') {
			throw new Error('Crashing now');
		}
	}
</script>
