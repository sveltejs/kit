<script>
	import Contents from '$lib/docs/Contents.svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<div class="container">
	<div class="page">
		<slot />
	</div>

	<div class="toc-container">
		<Contents contents={data.sections} />
	</div>
</div>

<style>
	.container {
		--sidebar-menu-width: 28rem;
		--sidebar-width: var(--sidebar-menu-width);
	}

	.page {
		--extra-padding: 0rem;
		--on-this-page-display: none;
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side);
	}

	@media (min-width: 832px) {
		.toc-container {
			width: var(--sidebar-width);
			height: 100vh;
			overflow: auto;
			position: fixed;
			left: 0;
			top: 0;
		}

		.toc-container::before {
			content: '';
			position: fixed;
			width: 0;
			height: 100%;
			top: 0;
			left: calc(var(--sidebar-width) - 1px);
			border-right: 1px solid var(--sk-back-5);
		}

		.page {
			padding-left: calc(var(--sidebar-width) + var(--sk-page-padding-side) + var(--extra-padding));
		}
	}

	@media (min-width: 1200px) {
		.container {
			--sidebar-width: max(28rem, 23vw);
		}

		.page {
			--on-this-page-display: block;
			padding: var(--sk-page-padding-top) calc(var(--sidebar-width) + var(--sk-page-padding-side));
			margin: 0 auto;
			max-width: var(--sk-line-max-width);
			box-sizing: content-box;
		}
	}
</style>
