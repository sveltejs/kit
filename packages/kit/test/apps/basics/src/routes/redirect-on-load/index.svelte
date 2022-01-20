<script context="module">
	import { browser } from '$app/env';

	export async function load() {
		if (browser) {
			return {
				status: 303,
				redirect: '/redirect-on-load/redirected'
			};
		}

		return {};
	}
</script>

<h1>Woops!</h1>
<p>You shouldn't be here. You should have been directed to /redirect!</p>
