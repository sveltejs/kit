<script>
	import { afterUpdate } from 'svelte';
	import Icon from '../components/Icon.svelte';

	export let contents = [];
	export let path = null;
	export let prevent_sidebar_scroll = false;

	let show_contents = false;
	let ul;

	afterUpdate(() => {
		// bit of a hack — prevent sidebar scrolling if
		// TOC is open on mobile, or scroll came from within sidebar
		if (prevent_sidebar_scroll || show_contents && window.innerWidth < 832) return;

		const active = ul.querySelector('.active');

		if (active) {
			const { top, bottom } = active.getBoundingClientRect();

			const min = 200;
			const max = window.innerHeight - 200;

			if (top > max) {
				ul.parentNode.scrollBy({
					top: top - max,
					left: 0
				});
			} else if (bottom < min) {
				ul.parentNode.scrollBy({
					top: bottom - min,
					left: 0
				});
			}
		}
	});
</script>

<aside class="sidebar-container" class:open={show_contents}>
	<div class="sidebar" on:click={() => (show_contents = false)}>
		<!-- scroll container -->
		<ul
			bind:this={ul}
			class="reference-toc"
			on:mouseenter={() => (prevent_sidebar_scroll = true)}
			on:mouseleave={() => (prevent_sidebar_scroll = false)}
		>
			{#each contents as section}
				<li>
					<a class="section" class:active={section.path === path} href={section.path}>
						{section.title}
					</a>

					<ul>
						{#each section.sections as subsection}
							<li>
								<a
									class="subsection"
									class:active={subsection.path === path}
									href={subsection.path}
								>
									{subsection.title}
								</a>

								<ul>
									{#each subsection.sections as subsection}
										<li>
											<a
												class="nested subsection"
												class:active={subsection.path === path}
												href={subsection.path}
											>
												{subsection.title}
											</a>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	</div>

	<button on:click={() => (show_contents = !show_contents)}>
		<Icon name={show_contents ? 'close' : 'menu'} />
	</button>
</aside>

<style>
	aside {
		position: fixed;
		background-color: white;
		left: 0.8rem;
		bottom: 0.8rem;
		width: 2em;
		height: 2em;
		overflow: hidden;
		border: 1px solid #eee;
		box-shadow: 1px 1px 6px rgba(0, 0, 0, 0.1);
		transition: width 0.2s, height 0.2s;
	}

	aside button {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 3.4rem;
		height: 3.4rem;
	}

	aside.open {
		width: calc(100vw - 3rem);
		height: calc(100vh - var(--nav-h));
	}

	aside.open::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: calc(100% - 2rem);
		height: 2em;
		background: linear-gradient(
			to top,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.7) 50%,
			rgba(255, 255, 255, 1) 100%
		);
		pointer-events: none;
		z-index: 2;
	}

	aside::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: 1.9em;
		width: calc(100% - 2rem);
		height: 2em;
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.7) 50%,
			rgba(255, 255, 255, 1) 100%
		);
		pointer-events: none;
	}

	.sidebar {
		position: absolute;
		font-family: var(--font);
		overflow-y: auto;
		width: 100%;
		height: 100%;
		padding: 4em 1.6rem 2em 3.2rem;
		bottom: 2em;
	}

	li {
		display: block;
		line-height: 1.2;
		margin: 0 0 4rem 0;
	}

	a {
		position: relative;
		transition: color 0.2s;
		border-bottom: none;
		padding: 0;
		color: var(--second);
		user-select: none;
	}

	.section {
		display: block;
		padding: 0 0 0.8rem 0;
		font-size: var(--h6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.subsection {
		display: block;
		font-size: 1.6rem;
		font-family: var(--font);
		padding: 0 0 0.6em 0;
	}

	.section:hover,
	.subsection:hover,
	.active {
		color: var(--flash);
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

	.nested {
		padding-left: 1.2rem;
	}

	ul ul,
	ul ul li {
		margin: 0;
	}

	@media (min-width: 832px) {
		aside {
			display: block;
			width: var(--sidebar-w);
			height: 100vh;
			top: 0;
			left: 0;
			overflow: hidden;
			box-shadow: none;
			border: none;
			overflow: hidden;
			background-color: var(--second);
			color: white;
		}

		aside.open::before {
			display: none;
		}

		aside::after {
			content: '';
			bottom: 0;
			height: var(--top-offset);
			background: linear-gradient(
				to bottom,
				rgba(103, 103, 120, 0) 0%,
				rgba(103, 103, 120, 0.7) 50%,
				rgba(103, 103, 120, 1) 100%
			);
		}

		aside button {
			display: none;
		}

		.sidebar {
			padding: var(--top-offset) 0 6.4rem 3.2rem;
			font-family: var(--font);
			overflow-y: auto;
			height: 100%;
			bottom: auto;
			width: 100%;
		}

		a {
			color: var(--sidebar-text);
		}

		a:hover,
		.section:hover,
		.subsection:hover,
		.active {
			color: white;
		}
	}
</style>
