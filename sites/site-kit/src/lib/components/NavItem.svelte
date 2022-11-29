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
		font-size: var(--h5);
	}

	a:hover {
		color: var(--flash);
		opacity: 1;
	}

	[aria-current] {
		color: var(--prime);
	}
</style>
