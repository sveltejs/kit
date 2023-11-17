<script>
	import { page } from '$app/stores';
	import { copy_code_descendants } from '@sveltejs/site-kit/actions';
	import { Icon } from '@sveltejs/site-kit/components';
	import { DocsOnThisPage, setupDocsHovers } from '@sveltejs/site-kit/docs';
	import { onMount } from 'svelte';

	export let data;

	$: pages = data.sections.flatMap((section) => section.pages);
	$: index = pages.findIndex(({ path }) => path === $page.url.pathname);
	$: prev = pages[index - 1];
	$: next = pages[index + 1];

	setupDocsHovers();

	const redirects = {
		hmr: 'how-do-i-use-hmr-with-sveltekit',
		'read-package-json': 'how-do-i-include-details-from-package-json-in-my-application',
		packages: 'how-do-i-fix-the-error-i-m-getting-trying-to-include-a-package',
		integrations: 'how-do-i-use-x-with-sveltekit',
		'how-do-i-setup-a-database': 'how-do-i-use-x-with-sveltekit-how-do-i-setup-a-database',
		'how-do-i-use-a-client-side-only-library-that-depends-on-document-or-window':
			'how-do-i-use-x-with-sveltekit-how-do-i-use-a-client-side-only-library-that-depends-on-document-or-window',
		'how-do-i-use-a-different-backend-api-server':
			'how-do-i-use-x-with-sveltekit-how-do-i-use-a-different-backend-api-server',
		'how-do-i-use-middleware': 'how-do-i-use-x-with-sveltekit-how-do-i-use-middleware',
		'does-it-work-with-yarn-2': 'how-do-i-use-x-with-sveltekit-does-it-work-with-yarn-2',
		'how-do-i-use-with-yarn-3': 'how-do-i-use-x-with-sveltekit-how-do-i-use-with-yarn-3'
	};

	onMount(() => {
		if ($page.url.pathname !== '/docs/faq') return;

		const hash = $page.url.hash.replace(/^#/, '');

		if (!redirects[hash]) return;

		document.location.hash = `#${redirects[hash]}`;
	});
</script>

<svelte:head>
	<title>{data.page.title} • Docs • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit docs" />
	<meta name="twitter:description" content="{data.page.title} • SvelteKit documentation" />
	<meta name="Description" content="{data.page.title} • SvelteKit documentation" />
</svelte:head>

<div class="text content" use:copy_code_descendants>
	<h1>{data.page.title}</h1>

	<a
		class="edit"
		href="https://github.com/sveltejs/kit/edit/master/documentation/docs/{data.page.file}"
	>
		<Icon size={50} name="edit" /> Edit this page on GitHub
	</a>

	<DocsOnThisPage details={data.page} />

	<section>
		{@html data.page.content}
	</section>

	<div class="controls">
		<div>
			<span class:faded={!prev}>previous</span>
			{#if prev}
				<a href={prev.path}>{prev.title}</a>
			{/if}
		</div>

		<div>
			<span class:faded={!next}>next</span>
			{#if next}
				<a href={next.path}>{next.title}</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.content {
		width: 100%;
		margin: 0;
	}

	.edit {
		position: relative;
		font-size: 1.4rem;
		line-height: 1;
		z-index: 2;
	}

	.edit :global(.icon) {
		position: relative;
		top: -0.1rem;
		left: 0.3rem;
		width: 1.4rem;
		height: 1.4rem;
		margin-right: 0.5rem;
	}

	.controls {
		max-width: calc(var(--sk-line-max-width) + 1rem);
		border-top: 1px solid var(--sk-back-4);
		padding: 1rem 0 0 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin: 6rem 0 0 0;
	}

	.controls > :first-child {
		text-align: left;
	}

	.controls > :last-child {
		text-align: right;
	}

	.controls span {
		display: block;
		font-size: 1.2rem;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--sk-text-3);
	}

	.controls span.faded {
		opacity: 0.4;
	}
</style>
