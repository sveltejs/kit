<script>
	import { page } from '$app/stores';
	
	let dynamic_title = 'My Page';
	let dynamic_desc = 'Description';
	// Simulate the original user's scenario where paths might have leading slashes
	let a_path_to_svelte_kit_static_content = '/me.jpg'; // This would create double slashes
</script>

<svelte:head>
	<meta property="og:title" content={dynamic_title} />
	<meta property="og:description" content={dynamic_desc} />
	<meta property="og:url" content={$page.url.origin} />
	<meta property="og:image" content="{$page.url.host}/{a_path_to_svelte_kit_static_content}" />
</svelte:head>

<slot />

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>