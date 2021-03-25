<script>
	export let pages;
	export let p;
	export let href;

	let range;

	$: {
		range = [];
		for (let i = 1; i <= pages; ++i) {
			range.push(i);
		}
	}
</script>

{#if pages > 1}
	<nav>
		<ul class="pagination">
			{#each range as n}
				<li class="page-item" class:active={n == p}><a class="page-link" href={href(n)}>{n}</a></li>
			{/each}
		</ul>
	</nav>
{/if}
