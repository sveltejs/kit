<script lang="ts" module>
	const pages = import.meta.glob('./**/+page.svelte');
</script>

<h3>Tests</h3>
<ul style:font-family="sans-serif">
	{#each Object.keys(pages) as name (name)}
		{@const href = name.slice(1, -13)}
		<li>
			<a {href}>{href}</a>
		</li>
	{/each}
</ul>
