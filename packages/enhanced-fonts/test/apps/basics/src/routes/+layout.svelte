<script>
	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<nav>
	<a href="/">home</a>
	<a href="/b">b</a>
	<a href="/c">c</a>
</nav>

{@render children?.()}
