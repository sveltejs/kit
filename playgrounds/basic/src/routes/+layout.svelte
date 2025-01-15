<script>
	import { page, navigating } from '$app/state';

	let { children } = $props();

	$inspect(navigating.to);
</script>

<nav>
	<a href="/">/</a>
	<a href="/a">/a</a>
	<a href="/b">/b</a>
	<a href="/c">/c</a>
	<a href="/d">/d</a>
	<a href="/e">/e</a>
</nav>

{@render children()}
