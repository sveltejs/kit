<!--
	This page has its hydration script moved to the root of the <body>
	in src/hooks.js, to check that hydration still works correctly
	(https://github.com/sveltejs/kit/issues/4685)
-->
<script>
	import { browser } from '$app/env';
</script>

<h1>Hello from the {browser ? 'browser' : 'server'}</h1>
