<script>
	import { page } from '$app/stores';
	import TSToggle from './TSToggle.svelte';

	export let contents = [];
</script>

<nav>
	<ul class="sidebar">
		{#each contents as section}
			<li>
				<span class="section">
					{section.title}
				</span>

				<ul>
					{#each section.pages as { title, path }}
						<li>
							<a
								data-sveltekit-preload-data
								class="page"
								class:active={path === $page.url.pathname}
								href={path}
							>
								{title}
							</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>

<div class="ts-toggle">
	<TSToggle />
</div>

<style>
	nav {
		top: 0;
		left: 0;
		overflow: hidden;
		background-color: var(--sk-theme-2);
		color: white;
		min-height: 100vh;
	}

	.sidebar {
		padding: calc(var(--sk-nav-height) + 4rem) 0 6.4rem 3.2rem;
		font-family: var(--sk-font);
		overflow-y: auto;
		height: 100%;
		bottom: auto;
		width: 100%;
		columns: 2;
	}

	li {
		display: block;
		line-height: 1.2;
		margin: 0;
		margin-bottom: 4rem;
	}

	a {
		position: relative;
		transition: color 0.2s;
		border-bottom: none;
		padding: 0;
		color: rgba(255, 255, 255, 0.9);
		user-select: none;
	}

	.section {
		display: block;
		padding-bottom: 0.8rem;
		font-size: var(--sk-text-xs);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.page {
		display: block;
		font-size: 1.6rem;
		font-family: var(--sk-font);
		padding-bottom: 0.6em;
	}

	.active {
		font-weight: 700;
	}

	.active::after {
		content: '';
		position: absolute;
		right: 0;
		top: 2px;
		width: 0;
		height: 0;
		border: 6px solid transparent;
		border-right-color: white;
	}

	ul ul,
	ul ul li {
		margin: 0;
	}

	a:hover,
	.section:hover,
	.page:hover,
	.active {
		color: white;
	}

	.ts-toggle {
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		background-color: var(--sk-theme-2);
		color: white;
	}

	@media (min-width: 600px) {
		.sidebar {
			columns: 2;
			padding-left: var(--sk-page-padding-side);
			padding-right: var(--sk-page-padding-side);
		}
	}

	@media (min-width: 832px) {
		.sidebar {
			columns: 1;
			padding-left: 3.2rem;
			padding-right: 0;
		}

		nav::after {
			content: '';
			position: fixed;
			left: 0;
			bottom: calc(42px + var(--ukr-footer-height));
			width: var(--sk-page-sidebar-width);
			height: 2em;
			pointer-events: none;
			background: linear-gradient(
				to bottom,
				rgba(103, 103, 120, 0) 0%,
				rgba(103, 103, 120, 0.7) 50%,
				rgba(103, 103, 120, 1) 100%
			);
		}

		.ts-toggle {
			position: fixed;
			width: var(--sk-page-sidebar-width);
			bottom: var(--ukr-footer-height);
			z-index: 1;
			margin-right: 0;
		}
	}
</style>
