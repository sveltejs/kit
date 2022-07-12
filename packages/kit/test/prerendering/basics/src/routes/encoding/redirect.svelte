<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load() {
		return {
			status: 307,
			redirect: '/encoding/redirected%20path%20with%20encoded%20spaces'
		};
	}
</script>
