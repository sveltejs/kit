<script>
	export let href = null;
	export let external = null;
	export let title = null;
	export let selected = undefined;
</script>

{#if external}
	<li><a href={external} {title} rel="external"><slot /></a></li>
{:else}
	<li>
		<a aria-current={selected} {href} {title}>
			<slot />
		</a>
	</li>
{/if}

<style>
	a {
		font-size: var(--sk-text-s);
	}

	a:hover {
		color: var(--sk-theme-3);
		opacity: 1;
	}

	[aria-current] {
		color: var(--sk-theme-1);
	}
</style>
