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
		background-color: var(--sk-back-3);
		color: var(--sk-text-3);
	}

	.sidebar {
		padding: calc(var(--sk-nav-height) + var(--sk-page-padding-top)) 0 6.4rem 3.2rem;
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
		color: var(--sk-text-3);
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
		color: var(--sk-text-1);
	}

	ul ul,
	ul ul li {
		margin: 0;
	}

	.ts-toggle {
		width: calc(100% - 1px);
		border-top: 1px solid var(--sk-back-4);
		background-color: var(--sk-back-3);
	}

	@media (min-width: 600px) {
		.sidebar {
			columns: 2;
			padding-left: var(--sk-page-padding-side);
			padding-right: var(--sk-page-padding-side);
		}
	}

	@media (min-width: 700px) {
		.sidebar {
			columns: 3;
		}
	}

	@media (min-width: 832px) {
		.sidebar {
			columns: 1;
			padding-left: 3.2rem;
			padding-right: 0;
			width: var(--sidebar-menu-width);
			margin: 0 0 0 auto;
			overflow: hidden;
		}

		nav {
			min-height: 100vh;
		}

		nav::after {
			content: '';
			position: fixed;
			left: 0;
			bottom: 42px;
			width: calc(var(--sidebar-width) - 1px);
			height: 2em;
			pointer-events: none;
			background: linear-gradient(
				to bottom,
				hsla(var(--sk-back-3-hsl), 0) 0%,
				hsla(var(--sk-back-3-hsl), 0.7) 50%,
				hsl(var(--sk-back-3-hsl)) 100%
			);
		}

		.active::after {
			--size: 1rem;
			content: '';
			position: absolute;
			width: var(--size);
			height: var(--size);
			top: -0.1rem;
			right: calc(-0.5 * var(--size));
			background-color: var(--sk-back-1);
			border-left: 1px solid var(--sk-back-5);
			border-bottom: 1px solid var(--sk-back-5);
			transform: translateY(0.2rem) rotate(45deg);
			z-index: 2;
		}

		.ts-toggle {
			position: fixed;
			width: calc(var(--sidebar-width) - 1px);
			bottom: 0;
			z-index: 1;
			margin-right: 0;
		}
	}
</style>
