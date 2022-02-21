<script>
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	export let contents = [];

	let path = null;

	/** @type {HTMLElement} */
	let content;

	/** @type {NodeListOf<HTMLElement>} */
	let headings;

	/** @type {number[]} */
	let positions = [];

	onMount(async () => {
		await document.fonts.ready;

		update();
		highlight();
	});

	afterNavigate(() => {
		update();
		highlight();
	});

	function update() {
		content = document.querySelector('.content');
		const { top } = content.getBoundingClientRect();

		// don't update `selected` for headings above level 4, see _sections.js
		headings = content.querySelectorAll('[id]:not([data-scrollignore])');

		positions = Array.from(headings).map((heading) => {
			return heading.getBoundingClientRect().top - top;
		});
	}

	function highlight() {
		const { top } = content.getBoundingClientRect();

		let i = headings.length;

		while (i--) {
			if (positions[i] + top < 40) {
				const heading = headings[i];
				path = `${$page.url.pathname}#${heading.id}`;
				return;
			}
		}

		path = $page.url.pathname;
	}
</script>

<svelte:window on:scroll={highlight} on:resize={update} />

<nav>
	<ul class="sidebar">
		{#each contents as section}
			<li>
				<a
					class="section"
					sveltekit:prefetch
					class:active={section.path === path}
					href={section.path}
				>
					{section.title}
				</a>

				<ul>
					{#each section.sections as subsection}
						<li>
							<a
								class="subsection"
								sveltekit:prefetch
								class:active={subsection.path === path}
								href={subsection.path}
							>
								{subsection.title}
							</a>

							{#if section.path === $page.url.pathname}
								<ul>
									{#each subsection.sections as subsection}
										<li>
											<a
												class="nested subsection"
												class:active={subsection.path === path}
												href={subsection.path}
												sveltekit:prefetch
											>
												{subsection.title}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>

<style>
	nav {
		top: 0;
		left: 0;
		overflow: hidden;
		background-color: var(--second);
		color: white;
	}

	.sidebar {
		padding: var(--top-offset) 0 6.4rem 3.2rem;
		font-family: var(--font);
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
		color: var(--sidebar-text);
		user-select: none;
	}

	.section {
		display: block;
		padding-bottom: 0.8rem;
		font-size: var(--h6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.subsection {
		display: block;
		font-size: 1.6rem;
		font-family: var(--font);
		padding-bottom: 0.6em;
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

	a:hover,
	.section:hover,
	.subsection:hover,
	.active {
		color: white;
	}

	@media (min-width: 600px) {
		.sidebar {
			columns: 2;
			padding-left: var(--side-nav);
			padding-right: var(--side-nav);
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
			bottom: 0;
			width: var(--sidebar-w);
			height: 2em;
			pointer-events: none;
			height: var(--top-offset);
			background: linear-gradient(
				to bottom,
				rgba(103, 103, 120, 0) 0%,
				rgba(103, 103, 120, 0.7) 50%,
				rgba(103, 103, 120, 1) 100%
			);
		}
	}
</style>
