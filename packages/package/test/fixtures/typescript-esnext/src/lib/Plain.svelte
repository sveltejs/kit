<script>
	/** @type {import('./foo').Foo} */
	export let foo;
</script>

<svelte:head>
	<script type="application/ld+json">
		{
			"@context": "http://schema.org",
			"@type": "Corporation",
			"name": "Svelte Corp",
			"description": "Svelte will cybernetically enhance you",
			"naics": "523910",
			"url": "https://svelte.dev"
		}
	</script>
</svelte:head>
