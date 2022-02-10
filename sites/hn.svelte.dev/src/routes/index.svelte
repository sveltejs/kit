<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ url }) {
		return {
			redirect: '/top/1',
			status: url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? 302 : 301
		};
	}
</script>
