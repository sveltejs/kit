<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export function load(pageContext) {
		if (browser) {
			window.pageContext = pageContext;
		}

		return {
			props: { foo: 'bar' }
		};
	}
</script>

<script>
	/** @type {string} */
	export let foo;
</script>

<h1>bar == {foo}?</h1>

<a href="/load/fetch-request">fetch request</a>
<a href="/load/fetch-credentialed">fetch credentialed</a>
<a href="/load/fetch-headers">fetch headers</a>
<a href="/load/large-response">large response</a>
<a href="/load/raw-body">raw body</a>
<a href="/load/server-fetch-request">server fetch request</a>
