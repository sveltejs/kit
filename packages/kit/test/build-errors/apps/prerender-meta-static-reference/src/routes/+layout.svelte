<script>
	let dynamic_title = 'My Page';
	let dynamic_desc = 'Description';
</script>

<svelte:head>
	<meta property="og:title" content={dynamic_title} />
	<meta property="og:description" content={dynamic_desc} />
	<meta property="og:url" content="http://sveltekit-prerender" />
	<meta property="og:image" content="sveltekit-prerender//me.jpg" />
</svelte:head>

<slot />

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>