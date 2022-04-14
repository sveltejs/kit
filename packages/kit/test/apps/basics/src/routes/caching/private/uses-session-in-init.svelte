<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			maxage: 30
		};
	}
</script>

<script>
	import { session } from '$app/stores';

	const session_exists = !!$session;
</script>

<h1>this page will be cached for 30 seconds ({session_exists})</h1>
