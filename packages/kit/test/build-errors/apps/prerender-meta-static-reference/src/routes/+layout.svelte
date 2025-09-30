<script>
	import { page } from '$app/stores';

	let dynamic_title = 'My Page';
	let dynamic_desc = 'Description';
	
	// Generate many problematic URLs with double slashes
	let imageUrls = [];
	for (let i = 0; i < 10; i++) {
		imageUrls.push(`sveltekit-prerender//image${i}.jpg`);
	}
</script>

<svelte:head>
	<meta property="og:title" content={dynamic_title} />
	<meta property="og:description" content={dynamic_desc} />
	<meta property="og:url" content="http://sveltekit-prerender" />
	{#each imageUrls as imageUrl}
		<meta property="og:image" content={imageUrl} />
	{/each}
</svelte:head>

<slot />

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>