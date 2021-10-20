<script context="module">
	export function load({ page }) {
		let host = page.host;
		const i = host.indexOf(':');
		if (i >= 0) {
			host = host.substring(0, i);
		}
		return {
			redirect: '/top/1',
			status: host === 'localhost' || host === '127.0.0.1' ? 302 : 301
		};
	}
</script>
