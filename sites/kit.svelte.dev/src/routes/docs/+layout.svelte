<script>
	import Contents from '$lib/docs/Contents.svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<div class="grid">
	<slot />
	<div class="toc-container">
		<Contents contents={data.sections} />
	</div>
</div>

<style>
	@media (min-width: 832px) {
		.grid {
			grid-template-rows: unset;
			grid-template-columns: var(--sk-page-sidebar-width) 1fr;
		}

		.toc-container {
			width: var(--sk-page-sidebar-width);
			height: 100vh;
			overflow: auto;
			position: fixed;
			left: 0;
			top: 0;
		}
	}
</style>
