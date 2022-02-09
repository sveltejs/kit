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

	onMount(() => {
		// wait for fonts to load...
		const timeouts = [setTimeout(onresize, 1000), setTimeout(onscroll, 5000)];

		update();
		highlight();

		return () => {
			window.removeEventListener('scroll', onscroll, true);
			window.removeEventListener('resize', onresize, true);

			timeouts.forEach((timeout) => clearTimeout(timeout));
		};
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
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>

<style>
	nav {
		/* position: fixed; */
		/* inline-size: var(--sidebar-w); */
		/* block-size: 100vh; */
		inset-block-start: 0;
		inset-inline-start: 0;
		overflow: hidden;
		background-color: var(--second);
		color: white;
	}

	nav::after {
		content: '';
		position: fixed;
		inset-inline-start: 0;
		inset-block-end: 0;
		inline-size: var(--sidebar-w);
		block-size: 2em;
		pointer-events: none;
		block-size: var(--top-offset);
		background: linear-gradient(
			to bottom,
			rgba(103, 103, 120, 0) 0%,
			rgba(103, 103, 120, 0.7) 50%,
			rgba(103, 103, 120, 1) 100%
		);
	}

	.sidebar {
		padding-inline: 3.2rem 0;
		padding-block: var(--top-offset) 6.4rem;
		font-family: var(--font);
		overflow-y: auto;
		block-size: 100%;
		inset-block-end: auto;
		inline-size: 100%;
		columns: 2;
	}

	li {
		display: block;
		line-height: 1.2;
		margin: 0;
		margin-block-end: 4rem;
	}

	a {
		position: relative;
		transition: color 0.2s;
		border-block-end: none;
		padding: 0;
		color: var(--sidebar-text);
		user-select: none;
	}

	.section {
		display: block;
		padding-block-end: 0.8rem;
		font-size: var(--h6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.subsection {
		display: block;
		font-size: 1.6rem;
		font-family: var(--font);
		padding-block-end: 0.6em;
	}

	.active::after {
		content: '';
		position: absolute;
		inset-inline-end: 0;
		inset-block-start: 2px;
		inline-size: 0;
		block-size: 0;
		border: 6px solid transparent;
		border-inline-end-color: white;
	}

	.nested {
		padding-inline-start: 1.2rem;
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
			padding-inline: var(--side-nav);
		}
	}

	@media (min-width: 832px) {
		.sidebar {
			columns: 1;
			padding-inline: 3.2rem 0;
		}
	}
</style>
