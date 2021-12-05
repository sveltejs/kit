<script>
	const numbers = [...Array(300).keys()];
</script>

<!-- this h1 causes margin outside of body due to collapse -->
<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation.</p>

<ul>
	{#each numbers as number}
		<li><a id="number-{number}" href="/scroll/{number}">{number}</a></li>
	{/each}
</ul>
