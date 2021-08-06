<script context="module">
	import {dev} from '$app/env';
	export function load() {
		return { redirect: '/top/1', status: dev ? 302 : 301 };
	}
</script>
