<script>
	/** @type {import('./foo').Foo} */
	export let foo;
</script>

<svelte:head>
  <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
</svelte:head>
