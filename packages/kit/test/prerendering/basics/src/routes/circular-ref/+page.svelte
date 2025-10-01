<script>
	import { page } from '$app/stores';
	
	let dynamic_title = 'My Page';
	let dynamic_desc = 'Description';
	// Simulate the scenario where paths might have leading slashes creating circular references
	let a_path_to_svelte_kit_static_content = '/me.jpg';
</script>

<svelte:head>
	<meta property="og:title" content={dynamic_title} />
	<meta property="og:description" content={dynamic_desc} />
	<meta property="og:url" content={$page.url.origin} />
	<meta property="og:image" content="{$page.url.host}/{a_path_to_svelte_kit_static_content}" />
</svelte:head>

<h1>Circular Reference Test</h1>
<p>This page tests that circular references in meta tags don't cause infinite loops</p>
