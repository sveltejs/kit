<script context="module">
	export function preload(pageContext) {
		if (typeof window !== 'undefined') {
			window.pageContext = pageContext;
		}

		return { foo: 'bar' };
	}
</script>

<script>
	export let foo;
</script>

<h1>bar == {foo}?</h1>
