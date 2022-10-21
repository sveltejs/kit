<script>
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	/**
	 * @type {Array<{title: string; anchor:string}>}
	 */
	export let page_contents;

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

<div class="otp">On This Page</div>
<nav>
	{#each page_contents as { title, anchor }}
		<a href={`#${anchor}`} class:active={`#${anchor}` === hash}>{title}</a>
	{/each}
</nav>

<style>
	.otp {
		padding: 1rem;
	}
	a {
		display: block;
		padding: 0.25rem 1rem;
		color: var(--second);
		border-left: 2px solid var(--back-api);
	}
	a.active {
		font-weight: bold;
		border-color: var(--second);
	}
</style>
