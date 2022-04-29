<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			stuff: {
				message: 'original'
			}
		};
	}
</script>

<slot></slot>
