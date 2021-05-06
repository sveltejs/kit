<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			context: {
				message: 'original'
			}
		};
	}
</script>

<slot></slot>
