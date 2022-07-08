<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load() {
		return {
			status: 307,
			redirect: '/docs/introduction'
		};
	}
</script>
