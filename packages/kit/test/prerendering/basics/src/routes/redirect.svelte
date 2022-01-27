<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load() {
		return {
			status: 301,
			redirect: 'https://example.com/redirected'
		};
	}
</script>
