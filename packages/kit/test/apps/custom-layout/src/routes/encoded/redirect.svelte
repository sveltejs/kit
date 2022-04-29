<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load() {
		return {
			status: 307,
			redirect: 'redirected?embedded=' + encodeURIComponent('/苗条?foo=bar&fizz=buzz')
		};
	}
</script>
