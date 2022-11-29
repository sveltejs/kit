<script>
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData['page']} */
	export let details;

	/** @type {string} */
	let hash = '';

	/** @type {number} */
	let height = 0;

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

		headings = content.querySelectorAll('h3[id]');

		positions = Array.from(headings).map((heading) => {
			const style = getComputedStyle(heading);
			return heading.getBoundingClientRect().top - parseFloat(style.scrollMarginTop) - top;
		});

		height = window.innerHeight - 50 /* bottom banner height */;
	}

	function highlight() {
		const { top, bottom } = content.getBoundingClientRect();
		let i = headings.length;

		while (i--) {
			if (bottom - height < 50 || positions[i] + top < 100) {
				const heading = headings[i];
				hash = `#${heading.id}`;
				return;
			}
		}

		hash = '';
	}

	/** @param {URL} url */
	function select(url) {
		// belt...
		setTimeout(() => {
			hash = url.hash;
		});

		// ...and braces
		window.addEventListener(
			'scroll',
			() => {
				hash = url.hash;
			},
			{ once: true }
		);
	}
</script>

<svelte:window on:scroll={highlight} on:resize={update} on:hashchange={() => select($page.url)} />

<aside class="on-this-page">
	<h2>On this page</h2>
	<nav>
		<ul>
			<li><a href="/docs/{details.slug}" class:active={hash === ''}>{details.title}</a></li>
			{#each details.sections as { title, slug }}
				<li><a href={`#${slug}`} class:active={`#${slug}` === hash}>{title}</a></li>
			{/each}
		</ul>
	</nav>
</aside>

<style>
	.on-this-page {
		display: none;
	}

	h2 {
		text-transform: uppercase;
		font-size: 1.4rem;
		font-weight: 400;
		margin: 0 0 1rem 0;
		padding: 0 0 0 0.6rem;
		color: var(--sk-theme-2);
	}

	ul {
		list-style: none;
	}

	a {
		display: block;
		padding: 0.3rem 0.5rem;
		color: var(--sk-theme-2);
		border-left: 2px solid transparent;
	}

	a:hover {
		text-decoration: none;
		background: var(--sk-back-1);
	}

	a.active {
		background: var(--sk-back-1);
		border-left-color: var(--sk-theme-1);
	}

	/* a.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 4px;
		width: 2px;
		height: calc(100% - 8px);
		background-color: var(--sk-theme-1);
	} */

	@media (min-width: 1300px) {
		.on-this-page {
			display: block;
			padding: 0 var(--sk-page-padding-side);
			width: calc(var(--sk-page-sidebar-width) - 15px); /* substract scrollbar */
			position: fixed;
			top: calc(var(--sk-page-padding-top) + var(--sk-nav-height));
			left: calc(
				var(--sk-page-sidebar-width) + var(--sk-page-padding-side) + var(--sk-line-max-width)
			);
		}
	}
</style>
