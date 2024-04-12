<script>
	/** @type {import('./foo').Foo} */
	export let foo;
</script>

<svelte:head>
  <script type="application/ld+json">
    {
      "foo": "bar"
    }
  </script>
</svelte:head>
