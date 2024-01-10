<script>
	import { page } from '$app/stores';
	import { DocsContents } from '@sveltejs/site-kit/docs';

	export let data;

	$: pageData = $page.data.page;
	$: category = pageData?.category;
</script>

<div class="container">
	<div class="page">
		{#if category}
			<p class="category">{category}</p>
		{/if}
		<slot />
	</div>

	<div class="toc-container">
		<DocsContents contents={data.sections} />
	</div>
</div>

<style>
	.container {
		--sidebar-menu-width: 28rem;
		--sidebar-width: var(--sidebar-menu-width);
		--ts-toggle-height: 4.2rem;
	}

	.page {
		--on-this-page-display: none;
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side);
	}

	.category {
		font: 700 var(--sk-text-s) var(--sk-font);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 0.5em;
		color: var(--sk-text-3);
	}

	.toc-container {
		background: var(--sk-back-3);
		display: none;
	}

	@media (min-width: 832px) {
		.toc-container {
			display: block;
			width: var(--sidebar-width);
			height: calc(
				100vh - var(--sk-nav-height) - var(--ts-toggle-height) - var(--sk-banner-bottom-height)
			);
			position: fixed;
			left: 0;
			top: var(--sk-nav-height);
			overflow: hidden;
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
			padding-left: calc(var(--sidebar-width) + var(--sk-page-padding-side));
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
