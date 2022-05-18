<script context="module">
	import { base } from '$app/paths';

	export function load() {
		return {
			status: 301,
			redirect: `${base}/dynamic/foo`
		};
	}
</script>