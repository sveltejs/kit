<script context="module">
	import { browser } from '$app/env';

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
	export let foo;
</script>

<h1>bar == {foo}?</h1>

<a href="/load/fetch-request">fetch request</a>
<a href="/load/fetch-credentialed">fetch credentialed</a>
<a href="/load/large-response">large response</a>
